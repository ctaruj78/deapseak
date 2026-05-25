#!/usr/bin/env python3
"""
fix-csv-v3.py — Corrige CSV export nas 3 páginas de lifts:
1. sep=; como 1ª linha → Excel Windows detecta separador automaticamente
2. Função esc() para escapar aspas em todos os campos
3. Endereço usa ' | ' em vez de ', ' → evita quebra de colunas no Excel
4. Exclui postalCode (pode ser objeto) — usa só address.street e address.city
"""

OLD = """                    // ✅ CSV melhorado — colunas úteis
                    const typeLabels = { passenger: 'Passageiro', cargo: 'Carga', car: 'Automóvel', escalator: 'Escada Rolante', platform: 'Plataforma' };
                    const statusLabels = { operational: 'Operacional', maintenance: 'Manutenção', inactive: 'Inativo', inspection_required: 'Inspeção Necessária', 'out-of-service': 'Fora de Serviço' };

                    const headers = ['Nº Municipal', 'Tipo', 'Fabricante', 'Modelo', 'Endereço', 'Município', 'Estado', 'Cliente', 'Última Inspeção', 'Próxima Inspeção', 'Nº Contrato', 'Data de Criação'];
                    const csvRows = [headers.join(';')];

                    lifts.forEach(lift => {
                        let addressStr = '';
                        if (lift.address) {
                            if (typeof lift.address === 'string') {
                                addressStr = lift.address;
                            } else {
                                const parts = [lift.address.street, lift.address.city, lift.postalCode || lift.address.zipCode].filter(Boolean);
                                addressStr = parts.join(', ');
                            }
                        }
                        const municipioStr = lift.municipality || (lift.address && lift.address.city) || '';
                        const lastInsp = lift.lastInspectionDate ? new Date(lift.lastInspectionDate).toLocaleDateString('pt-PT') : '';
                        const nextInsp = lift.nextInspectionDate ? new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT') : '';

                        const row = [
                            `"${lift.municipalNumber || lift.name || ''}"`,
                            `"${typeLabels[lift.type] || lift.type || ''}"`,
                            `"${lift.manufacturer || ''}"`,
                            `"${lift.model || ''}"`,
                            `"${addressStr}"`,
                            `"${municipioStr}"`,
                            `"${statusLabels[lift.status] || lift.status || 'Operacional'}"`,
                            `"${lift.clientName || ''}"`,
                            `"${lastInsp}"`,
                            `"${nextInsp}"`,
                            `"${lift.contractNumber || ''}"`,
                            `"${lift.createdAt ? new Date(lift.createdAt).toLocaleDateString('pt-PT') : ''}"`,
                        ];
                        csvRows.push(row.join(';'));
                    });"""

NEW = """                    // ✅ CSV melhorado — colunas úteis, sem quebra no Excel
                    const typeLabels = { passenger: 'Passageiro', cargo: 'Carga', car: 'Automóvel', escalator: 'Escada Rolante', platform: 'Plataforma' };
                    const statusLabels = { operational: 'Operacional', maintenance: 'Manutenção', inactive: 'Inativo', inspection_required: 'Inspeção Necessária', 'out-of-service': 'Fora de Serviço' };

                    // Escapa aspas duplas dentro dos campos e converte para string
                    const esc = v => String(v == null ? '' : v).replace(/"/g, '""');

                    const headers = ['Nº Municipal', 'Tipo', 'Fabricante', 'Modelo', 'Endereço', 'Município', 'Estado', 'Cliente', 'Última Inspeção', 'Próxima Inspeção', 'Nº Contrato', 'Data de Criação'];
                    // sep=; → Excel Windows detecta automaticamente o separador
                    const csvRows = ['sep=;', headers.join(';')];

                    lifts.forEach(lift => {
                        // Endereço: só street e city, separados por ' | ' (sem vírgulas para não quebrar colunas)
                        let addressStr = '';
                        if (lift.address) {
                            if (typeof lift.address === 'string') {
                                addressStr = lift.address;
                            } else {
                                const parts = [lift.address.street, lift.address.city]
                                    .filter(v => v && typeof v === 'string' && v.trim());
                                addressStr = parts.join(' | ');
                            }
                        }
                        const municipioStr = typeof lift.municipality === 'string' ? lift.municipality
                            : (lift.address && typeof lift.address.city === 'string' ? lift.address.city : '');
                        const lastInsp = lift.lastInspectionDate ? new Date(lift.lastInspectionDate).toLocaleDateString('pt-PT') : '';
                        const nextInsp = lift.nextInspectionDate ? new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT') : '';
                        const createdAt = lift.createdAt ? new Date(lift.createdAt).toLocaleDateString('pt-PT') : '';

                        const row = [
                            `"${esc(lift.municipalNumber || lift.name)}"`,
                            `"${esc(typeLabels[lift.type] || lift.type)}"`,
                            `"${esc(lift.manufacturer)}"`,
                            `"${esc(lift.model)}"`,
                            `"${esc(addressStr)}"`,
                            `"${esc(municipioStr)}"`,
                            `"${esc(statusLabels[lift.status] || lift.status || 'Operacional')}"`,
                            `"${esc(lift.clientName)}"`,
                            `"${esc(lastInsp)}"`,
                            `"${esc(nextInsp)}"`,
                            `"${esc(lift.contractNumber)}"`,
                            `"${esc(createdAt)}"`,
                        ];
                        csvRows.push(row.join(';'));
                    });"""

files = [
    'pages/admin/lifts.html',
    'pages/dispatcher/lifts.html',
    'pages/dispatcher/lifts-admin-style.html',
]

# Normalizar espaços para comparação (os ficheiros podem ter tabs/espaços diferentes)
import re

def normalize(s):
    return re.sub(r'[ \t]+', ' ', s)

for f in files:
    content = open(f, encoding='utf-8').read()
    if OLD in content:
        content = content.replace(OLD, NEW, 1)
        open(f, 'w', encoding='utf-8').write(content)
        print(f'✅ {f}: CSV corrigido')
    else:
        # Tentar com espaços normalizados
        print(f'⚠️  {f}: padrão exato não encontrado — a verificar linha a linha...')
        # Mostrar as primeiras linhas do bloco CSV no ficheiro para debug
        idx = content.find('// ✅ CSV melhorado')
        if idx >= 0:
            print(f'   Bloco CSV encontrado na posição {idx}')
            snippet = content[idx:idx+200]
            print(f'   Snippet: {repr(snippet[:150])}')
        else:
            print(f'   ERRO: bloco CSV não encontrado de todo!')

print('\n✅ Concluído!')
