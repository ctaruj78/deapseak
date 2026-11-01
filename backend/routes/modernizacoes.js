const express = require('express');
const router = express.Router({ mergeParams: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PDFDocument } = require('pdf-lib');
const Lift = require('../models/Lift');
const ComponenteCatalogo = require('../../models/ComponenteCatalogo');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

const DOCS_DIR = path.join(__dirname, '..', '..', 'uploads', 'certificados-componentes');
const validId = id => mongoose.Types.ObjectId.isValid(id);

// GET /api/lifts/:liftId/modernizacoes
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        if (!validId(req.params.liftId)) return res.status(400).json({ success: false, message: 'ID inválido' });
        const lift = await Lift.findById(req.params.liftId).select('modernizacoes').lean();
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        res.json({ success: true, data: lift.modernizacoes || [] });
    } catch (error) {
        console.error('❌ modernizacoes GET:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar modernizações' });
    }
});

// POST /api/lifts/:liftId/modernizacoes — regista a modernização e fixa os certificados em vigor à data de montagem
// body: { data, orcamento?, notas?, componentes: [{ componenteId, numeroSerie? }] }
router.post('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { liftId } = req.params;
        const { data, orcamento, notas, componentes } = req.body;
        if (!validId(liftId)) return res.status(400).json({ success: false, message: 'ID inválido' });
        const dataMontagem = new Date(data);
        if (!data || isNaN(dataMontagem)) return res.status(400).json({ success: false, message: 'Data de montagem inválida' });
        if (!Array.isArray(componentes) || !componentes.length || componentes.some(c => !validId(c.componenteId))) {
            return res.status(400).json({ success: false, message: 'Selecione pelo menos um componente' });
        }

        const lift = await Lift.exists({ _id: liftId });
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        const comps = await ComponenteCatalogo.find({ _id: { $in: componentes.map(c => c.componenteId) } });
        const porId = new Map(comps.map(c => [String(c._id), c]));
        if (componentes.some(c => !porId.has(String(c.componenteId)))) {
            return res.status(400).json({ success: false, message: 'Componente não encontrado no catálogo' });
        }

        const avisos = [];
        const entrada = { _id: new mongoose.Types.ObjectId(), data: dataMontagem, notas, criadoPor: req.user.id, componentes: [], documentos: [] };
        if (orcamento && validId(orcamento)) entrada.orcamento = orcamento;

        for (const { componenteId, numeroSerie } of componentes) {
            const c = porId.get(String(componenteId));
            const nome = `${c.fabricante} ${c.modelo}`;
            entrada.componentes.push({ componente: c._id, nome, tipo: c.tipo, numeroSerie: numeroSerie || '' });

            const docs = ComponenteCatalogo.documentosEmVigor(c, dataMontagem);
            if (!docs.some(d => d.tipo === 'certificado_ce' && !d.gerado)) {
                avisos.push(`${nome}: sem certificado no catálogo em vigor à data ${dataMontagem.toLocaleDateString('pt-PT')}`);
            }
            for (const d of docs) {
                if (d.foraValidade) avisos.push(`${nome}: "${d.titulo}" já estava expirado à data de montagem`);
                if (d.amostra) avisos.push(`${nome}: "${d.titulo}" é uma cópia de amostra`);
                entrada.documentos.push({
                    componente: c._id, componenteNome: nome, tipo: d.tipo, titulo: d.titulo, ficheiro: d.ficheiro,
                    numero: d.numero, revisao: d.revisao, organismoNotificado: d.organismoNotificado,
                    emitidoEm: d.emitidoEm, validoAte: d.validoAte, gerado: !!d.gerado, amostra: !!d.amostra,
                    foraValidade: !!d.foraValidade
                });
            }
        }

        // $push em vez de save(): não revalida o elevador inteiro (elevadores antigos podem ter campos em falta)
        await Lift.updateOne({ _id: liftId }, { $push: { modernizacoes: entrada } }, { runValidators: true });
        res.status(201).json({ success: true, data: entrada, avisos });
    } catch (error) {
        console.error('❌ modernizacoes POST:', error);
        res.status(500).json({ success: false, message: 'Erro ao registar modernização' });
    }
});

// DELETE /api/lifts/:liftId/modernizacoes/:mid (admin)
router.delete('/:mid', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const r = await Lift.updateOne({ _id: req.params.liftId }, { $pull: { modernizacoes: { _id: req.params.mid } } });
        if (!r.modifiedCount) return res.status(404).json({ success: false, message: 'Modernização não encontrada' });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ modernizacoes DELETE:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar modernização' });
    }
});

// Caminho seguro de um ficheiro do catálogo (impede path traversal)
function ficheiroSeguro(rel) {
    if (!rel) return null;
    const abs = path.resolve(DOCS_DIR, path.basename(rel));
    return abs.startsWith(DOCS_DIR) && fs.existsSync(abs) ? abs : null;
}

// GET /api/lifts/:liftId/modernizacoes/:mid/dossier — um único PDF com todos os certificados fixados
router.get('/:mid/dossier', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const lift = await Lift.findById(req.params.liftId).select('modernizacoes address').lean();
        const m = lift && (lift.modernizacoes || []).find(x => String(x._id) === req.params.mid);
        if (!m) return res.status(404).json({ success: false, message: 'Modernização não encontrada' });

        const out = await PDFDocument.create();
        let paginas = 0;
        const emFalta = [];
        const vistos = new Set();
        for (const d of m.documentos) {
            if (d.gerado || !d.ficheiro || vistos.has(d.ficheiro)) continue;
            vistos.add(d.ficheiro);
            const abs = ficheiroSeguro(d.ficheiro);
            if (!abs) { emFalta.push(d.titulo); continue; }
            try {
                const src = await PDFDocument.load(fs.readFileSync(abs), { ignoreEncryption: true });
                (await out.copyPages(src, src.getPageIndices())).forEach(p => { out.addPage(p); paginas++; });
            } catch (e) { emFalta.push(`${d.titulo} (PDF ilegível)`); }
        }
        if (!paginas) return res.status(404).json({ success: false, message: 'Sem ficheiros PDF para juntar', emFalta });

        if (emFalta.length) res.setHeader('X-Documentos-Em-Falta', encodeURIComponent(emFalta.join('; ')));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="certificados-${new Date(m.data).toISOString().slice(0, 10)}.pdf"`);
        res.send(Buffer.from(await out.save()));
    } catch (error) {
        console.error('❌ modernizacoes dossier:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar dossier' });
    }
});

// GET /api/lifts/:liftId/modernizacoes/:mid/documentos/:docId/ficheiro
router.get('/:mid/documentos/:docId/ficheiro', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const lift = await Lift.findById(req.params.liftId).select('modernizacoes').lean();
        const m = lift && (lift.modernizacoes || []).find(x => String(x._id) === req.params.mid);
        const d = m && m.documentos.find(x => String(x._id) === req.params.docId);
        const abs = d && ficheiroSeguro(d.ficheiro);
        if (!abs) return res.status(404).json({ success: false, message: 'Ficheiro não encontrado' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(abs)}"`);
        fs.createReadStream(abs).pipe(res);
    } catch (error) {
        console.error('❌ modernizacoes ficheiro:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter ficheiro' });
    }
});

module.exports = router;
