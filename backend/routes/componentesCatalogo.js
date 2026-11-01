const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ComponenteCatalogo = require('../../models/ComponenteCatalogo');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

// GET /api/componentes-catalogo?tipo=limitador — lista (admin/dispatcher)
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const filtro = {};
        if (req.query.tipo) filtro.tipo = req.query.tipo;
        if (req.query.ativo === 'true') filtro.ativo = true;
        const data = await ComponenteCatalogo.find(filtro)
            .sort({ tipo: 1, fabricante: 1, modelo: 1 })
            .collation({ locale: 'pt', strength: 1 })
            .lean();
        data.forEach(c => c.documentos.forEach(d => { d.estado = ComponenteCatalogo.estadoDocumento(d); }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ componentes-catalogo GET:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar catálogo' });
    }
});

router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const { tipo, fabricante, modelo, descricao, fabricanteMorada, dadosTecnicos, notas, pacotes, documentos, ativo } = req.body;
        if (!tipo || !fabricante || !modelo) {
            return res.status(400).json({ success: false, message: 'Tipo, fabricante e modelo são obrigatórios' });
        }
        const data = await ComponenteCatalogo.create({ tipo, fabricante, modelo, descricao, fabricanteMorada, dadosTecnicos, notas, pacotes, documentos, ativo });
        res.status(201).json({ success: true, data });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'Componente já existe' });
        console.error('❌ componentes-catalogo POST:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar componente' });
    }
});

router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const campos = ['tipo', 'fabricante', 'modelo', 'descricao', 'fabricanteMorada', 'dadosTecnicos', 'notas', 'pacotes', 'documentos', 'ativo'];
        const updates = {};
        campos.forEach(c => { if (req.body[c] !== undefined) updates[c] = req.body[c]; });
        const data = await ComponenteCatalogo.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!data) return res.status(404).json({ success: false, message: 'Componente não encontrado' });
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ componentes-catalogo PUT:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar componente' });
    }
});

router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const data = await ComponenteCatalogo.findByIdAndDelete(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Componente não encontrado' });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ componentes-catalogo DELETE:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar componente' });
    }
});

// --- Documentos (versões) -------------------------------------------------

const DOCS_DIR = path.join(__dirname, '..', '..', 'uploads', 'certificados-componentes');
const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf')
});

// POST /api/componentes-catalogo/:id/documentos — nova versão (multipart: ficheiro PDF + campos).
// Se houver `familia`, as versões anteriores da mesma família ficam "substituídas" a partir de `emitidoEm`.
router.post('/:id/documentos', authenticate, authorizeRoles('admin'), uploadPdf.single('ficheiro'), async (req, res) => {
    try {
        const comp = await ComponenteCatalogo.findById(req.params.id);
        if (!comp) return res.status(404).json({ success: false, message: 'Componente não encontrado' });

        const b = req.body;
        if (!b.tipo || !b.titulo) return res.status(400).json({ success: false, message: 'Tipo e título são obrigatórios' });

        let ficheiro = '';
        if (req.file) {
            // Só PDF verdadeiro (magic bytes), nome gerado no servidor
            if (req.file.buffer.slice(0, 5).toString() !== '%PDF-') {
                return res.status(400).json({ success: false, message: 'O ficheiro tem de ser PDF' });
            }
            const nome = `${comp.fabricante}-${comp.modelo}-${Date.now()}.pdf`.replace(/[^A-Za-z0-9._-]+/g, '_');
            fs.mkdirSync(DOCS_DIR, { recursive: true });
            fs.writeFileSync(path.join(DOCS_DIR, nome), req.file.buffer);
            ficheiro = `certificados-componentes/${nome}`;
        }

        const doc = {
            tipo: b.tipo, titulo: b.titulo, ficheiro, familia: b.familia || '',
            numero: b.numero, revisao: b.revisao, organismoNotificado: b.organismoNotificado,
            diretiva: b.diretiva, observacao: b.observacao,
            normas: b.normas ? String(b.normas).split(';').map(x => x.trim()).filter(Boolean) : [],
            emitidoEm: b.emitidoEm || undefined, validoAte: b.validoAte || undefined,
            gerado: b.gerado === 'true', amostra: b.amostra === 'true'
        };

        if (doc.familia && doc.emitidoEm) {
            comp.documentos.forEach(d => {
                if (d.familia === doc.familia && !d.substituidoEm && d.emitidoEm && d.emitidoEm < new Date(doc.emitidoEm)) {
                    d.substituidoEm = new Date(doc.emitidoEm);
                }
            });
        }
        comp.documentos.push(doc);
        await comp.save();
        res.status(201).json({ success: true, data: comp });
    } catch (error) {
        console.error('❌ componentes-catalogo POST documentos:', error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar documento' });
    }
});

// GET /api/componentes-catalogo/:id/documentos/:docId/ficheiro — descarregar PDF (autenticado)
router.get('/:id/documentos/:docId/ficheiro', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const comp = await ComponenteCatalogo.findById(req.params.id).lean();
        const doc = comp && comp.documentos.find(d => String(d._id) === req.params.docId);
        if (!doc || !doc.ficheiro) return res.status(404).json({ success: false, message: 'Ficheiro não encontrado' });
        const abs = path.resolve(DOCS_DIR, path.basename(doc.ficheiro));
        if (!abs.startsWith(DOCS_DIR) || !fs.existsSync(abs)) {
            return res.status(404).json({ success: false, message: 'Ficheiro não encontrado' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(abs)}"`);
        fs.createReadStream(abs).pipe(res);
    } catch (error) {
        console.error('❌ componentes-catalogo GET ficheiro:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter ficheiro' });
    }
});

// GET /api/componentes-catalogo/resolver?ids=a,b&data=2026-11-01 — documentos em vigor à data da montagem
router.get('/resolver', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const ids = String(req.query.ids || '').split(',').filter(Boolean);
        const data = req.query.data ? new Date(req.query.data) : new Date();
        if (!ids.length || isNaN(data)) return res.status(400).json({ success: false, message: 'ids e data válidos são obrigatórios' });
        const comps = await ComponenteCatalogo.find({ _id: { $in: ids } });
        res.json({
            success: true,
            data: comps.map(c => ({
                componente: { _id: c._id, tipo: c.tipo, fabricante: c.fabricante, modelo: c.modelo },
                documentos: ComponenteCatalogo.documentosEmVigor(c, data)
            }))
        });
    } catch (error) {
        console.error('❌ componentes-catalogo resolver:', error);
        res.status(500).json({ success: false, message: 'Erro ao resolver documentos' });
    }
});

module.exports = router;
