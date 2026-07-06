const express = require('express');
const router = express.Router();
const OrcamentoCategoria = require('../../models/OrcamentoCategoria');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

// GET /api/orcamento-categorias — lista catálogo (admin/dispatcher usam para montar orçamentos)
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const filtro = {};
        if (req.query.ativo === 'true') filtro.ativo = true;
        if (req.query.grupo) filtro.grupo = req.query.grupo;

        const categorias = await OrcamentoCategoria.find(filtro)
            .sort({ grupo: 1, ordem: 1, nome: 1 })
            .lean();

        res.json({ success: true, data: categorias });
    } catch (error) {
        console.error('❌ orcamento-categorias GET:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar categorias' });
    }
});

// GET /api/orcamento-categorias/:id
router.get('/:id', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const categoria = await OrcamentoCategoria.findById(req.params.id).lean();
        if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        res.json({ success: true, data: categoria });
    } catch (error) {
        console.error('❌ orcamento-categorias/:id GET:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar categoria' });
    }
});

// POST /api/orcamento-categorias — criar categoria (admin only)
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const { nome, grupo, descricao, unidade, precoSugerido, norma, notaNaoConformidade, critico, ativo, ordem } = req.body;

        if (!nome || !descricao) {
            return res.status(400).json({ success: false, message: 'Nome e descrição são obrigatórios' });
        }

        const categoria = await OrcamentoCategoria.create({
            nome,
            grupo,
            descricao,
            unidade,
            precoSugerido,
            norma,
            notaNaoConformidade,
            critico: !!critico,
            ativo: ativo !== undefined ? !!ativo : true,
            ordem,
            criadoPor: req.user.id
        });

        res.status(201).json({ success: true, data: categoria });
    } catch (error) {
        console.error('❌ orcamento-categorias POST:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar categoria' });
    }
});

// PUT /api/orcamento-categorias/:id — editar categoria (admin only)
router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const campos = ['nome', 'grupo', 'descricao', 'unidade', 'precoSugerido', 'norma', 'notaNaoConformidade', 'critico', 'ativo', 'ordem'];
        const updates = {};
        campos.forEach(campo => {
            if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
        });

        const categoria = await OrcamentoCategoria.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada' });

        res.json({ success: true, data: categoria });
    } catch (error) {
        console.error('❌ orcamento-categorias PUT:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar categoria' });
    }
});

// DELETE /api/orcamento-categorias/:id (admin only)
router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const categoria = await OrcamentoCategoria.findByIdAndDelete(req.params.id);
        if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        res.json({ success: true, message: 'Categoria eliminada' });
    } catch (error) {
        console.error('❌ orcamento-categorias DELETE:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar categoria' });
    }
});

module.exports = router;
