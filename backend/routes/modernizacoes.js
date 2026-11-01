const express = require('express');
const router = express.Router({ mergeParams: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
// jszip vem como dependência do exceljs (já usado no projeto)
const JSZip = require('jszip');
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

// GET /api/lifts/:liftId/modernizacoes/:mid/dossier — ZIP com todos os certificados fixados (um PDF por documento + índice)
router.get('/:mid/dossier', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const lift = await Lift.findById(req.params.liftId).select('modernizacoes address').lean();
        const m = lift && (lift.modernizacoes || []).find(x => String(x._id) === req.params.mid);
        if (!m) return res.status(404).json({ success: false, message: 'Modernização não encontrada' });

        const slug = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
        const data = d => (d ? new Date(d).toLocaleDateString('pt-PT') : '—');
        const zip = new JSZip();
        const indice = [`Dossier de certificados — montagem em ${data(m.data)}`, ''];
        const vistos = new Set();
        let n = 0;
        for (const d of m.documentos) {
            const linha = `${d.componenteNome} | ${d.titulo} | nº ${d.numero || '—'}${d.revisao ? ' rev. ' + d.revisao : ''} | emitido ${data(d.emitidoEm)} | válido até ${data(d.validoAte)}`;
            if (d.gerado) { indice.push(`[a gerar] ${linha}`); continue; }
            const abs = !vistos.has(d.ficheiro) && ficheiroSeguro(d.ficheiro);
            if (vistos.has(d.ficheiro)) continue;
            vistos.add(d.ficheiro);
            if (!abs) { indice.push(`[EM FALTA] ${linha}`); continue; }
            const nome = `${String(++n).padStart(2, '0')}-${slug(d.componenteNome)}-${slug(d.titulo)}.pdf`;
            zip.file(nome, fs.readFileSync(abs));
            indice.push(`${nome} — ${linha}${d.foraValidade ? ' (expirado à data de montagem)' : ''}${d.amostra ? ' (AMOSTRA)' : ''}`);
        }
        if (!n) return res.status(404).json({ success: false, message: 'Sem ficheiros PDF no dossier' });
        zip.file('indice.txt', indice.join('\n'));

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="certificados-${new Date(m.data).toISOString().slice(0, 10)}.zip"`);
        res.send(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
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
