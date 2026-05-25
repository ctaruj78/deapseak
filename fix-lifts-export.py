#!/usr/bin/env python3
"""
fix-lifts-export.py — Melhora CSV e implementa PDF export em lifts.html files
"""
import re

JSPDF_SCRIPT_TAG = '''    <script src="/node_modules/jspdf/dist/jspdf.umd.min.js"></script>
    <script src="/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js"></script>'''

NEW_CSV_BLOCK = '''                    // ✅ CSV melhorado — colunas úteis para gestão
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
                    });'''

NEW_PDF_BLOCK = '''                // ✅ PDF export via jsPDF + autotable
                (async function() {
                    const btn = exportPDFBtn;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> A gerar PDF...';
                    try {
                        if (typeof window.jspdf === 'undefined') {
                            await new Promise((resolve, reject) => {
                                const s = document.createElement('script');
                                s.src = '/node_modules/jspdf/dist/jspdf.umd.min.js';
                                s.onload = resolve; s.onerror = () => reject(new Error('jsPDF não carregado'));
                                document.head.appendChild(s);
                            });
                        }
                        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF.prototype.autoTable === 'undefined') {
                            await new Promise((resolve, reject) => {
                                const s = document.createElement('script');
                                s.src = '/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js';
                                s.onload = resolve; s.onerror = () => reject(new Error('AutoTable não carregado'));
                                document.head.appendChild(s);
                            });
                        }

                        let lifts = window.allLiftsData;
                        if (!lifts || lifts.length === 0) {
                            lifts = await window.loadLiftsFromAPI();
                        }
                        if (!lifts || lifts.length === 0) { alert('Sem dados para exportar'); return; }

                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

                        // Título
                        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
                        doc.text('FestLift — Gestão de Elevadores', 14, 14);
                        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                        const hoje = new Date().toLocaleDateString('pt-PT');
                        doc.text(`Exportado em: ${hoje}   ·   Total: ${lifts.length} elevadores`, 14, 21);

                        const typeLabels = { passenger: 'Passageiro', cargo: 'Carga', car: 'Automóvel', escalator: 'Escada Rolante', platform: 'Plataforma' };
                        const statusLabels = { operational: 'Operacional', maintenance: 'Manutencao', inactive: 'Inativo', inspection_required: 'Insp. Necessaria', 'out-of-service': 'Fora Servico' };

                        const tableData = lifts.map(lift => {
                            let addr = '';
                            if (lift.address) {
                                if (typeof lift.address === 'string') addr = lift.address;
                                else addr = [lift.address.street, lift.address.city].filter(Boolean).join(', ');
                            }
                            const municipio = lift.municipality || (lift.address && lift.address.city) || '-';
                            const lastInsp = lift.lastInspectionDate ? new Date(lift.lastInspectionDate).toLocaleDateString('pt-PT') : '-';
                            const nextInsp = lift.nextInspectionDate ? new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT') : '-';
                            return [
                                lift.municipalNumber || lift.name || '-',
                                typeLabels[lift.type] || lift.type || '-',
                                lift.manufacturer || '-',
                                lift.model || '-',
                                addr || '-',
                                municipio,
                                statusLabels[lift.status] || lift.status || '-',
                                lift.clientName || '-',
                                lastInsp,
                                nextInsp,
                            ];
                        });

                        doc.autoTable({
                            head: [['Nº Municipal', 'Tipo', 'Fabricante', 'Modelo', 'Endereço', 'Município', 'Estado', 'Cliente', 'Últ. Inspeção', 'Próx. Inspeção']],
                            body: tableData,
                            startY: 26,
                            styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', halign: 'left' },
                            headStyles: { fillColor: [40, 167, 69], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                            alternateRowStyles: { fillColor: [245, 252, 245] },
                            columnStyles: {
                                0: { cellWidth: 25 }, 1: { cellWidth: 20 },
                                2: { cellWidth: 22 }, 3: { cellWidth: 22 },
                                4: { cellWidth: 55 }, 5: { cellWidth: 22 },
                                6: { cellWidth: 22 }, 7: { cellWidth: 28 },
                                8: { cellWidth: 20 }, 9: { cellWidth: 20 },
                            },
                            didDrawPage: function(data) {
                                const W = doc.internal.pageSize.width;
                                const H = doc.internal.pageSize.height;
                                doc.setFontSize(8); doc.setTextColor(150);
                                doc.text(`Página ${data.pageNumber}`, W - 20, H - 6);
                                doc.setTextColor(0);
                            }
                        });

                        doc.save(`gestao_elevadores_${new Date().toISOString().slice(0,10)}.pdf`);
                        if (typeof toastr !== 'undefined') toastr.success('PDF exportado com sucesso!');
                    } catch (err) {
                        console.error('Erro ao gerar PDF:', err);
                        if (typeof toastr !== 'undefined') toastr.error('Erro ao gerar PDF: ' + err.message);
                        else alert('Erro ao gerar PDF: ' + err.message);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-file-pdf mr-1"></i> Exportar PDF';
                    }
                })();'''

# Old CSV block pattern (common to all 3 files)
OLD_CSV_RE = re.compile(
    r"// [^\n]*[Фф]ормуexisteмо CSV.*?"
    r"const headers = \['ID', 'Nome', 'Endere[çc]o', 'Fabricante', 'Modelo', 'Cidade', 'Estado', 'Data de cria[çc][aã]o'\];\s*"
    r"const csvRows = \[headers\.join\(','\)\];\s*"
    r".*?"
    r"csvRows\.push\(row\.join\(','\)\);\s*\}\);",
    re.DOTALL
)

# Old PDF block patterns
OLD_PDF_ADMIN = (
    "alert('Exportar PDF estará disponível na próxima versão.\\n\\nPor enquanto use a exportação CSV.');\n"
    "                // TODO: Adicionar jsPDF бібліотеку e реалізувати експорт PDF"
)
OLD_PDF_DISPATCHER = (
    "alert('A exportação PDF estará disponível na próxima versão.\\n\\nPor enquanto, utilize a exportação CSV.');\n"
    "                // TODO: Adicionar jsPDF бібліотеку e реалízar exportação PDF"
)

# Files to process
FILES = [
    'pages/admin/lifts.html',
    'pages/dispatcher/lifts.html',
    'pages/dispatcher/lifts-admin-style.html',
]

for filepath in FILES:
    try:
        content = open(filepath, 'r', encoding='utf-8').read()
    except Exception as e:
        print(f'❌ Cannot read {filepath}: {e}')
        continue

    original = content
    changes = []

    # == 1. Fix CSV ==
    csv_match = OLD_CSV_RE.search(content)
    if csv_match:
        content = content[:csv_match.start()] + NEW_CSV_BLOCK + content[csv_match.end():]
        changes.append('CSV improved')
    else:
        print(f'  ⚠️  CSV pattern not found in {filepath}')

    # == 2. Fix PDF alert ==
    for old_pdf in [OLD_PDF_ADMIN, OLD_PDF_DISPATCHER]:
        if old_pdf in content:
            content = content.replace(old_pdf, NEW_PDF_BLOCK)
            changes.append('PDF export implemented')
            break
    else:
        # Try a simpler pattern
        simple_pdf_re = re.compile(
            r"alert\('.*?exportação PDF.*?'\);\s*"
            r"// TODO: Adicionar jsPDF.*?",
            re.DOTALL
        )
        pdf_match = simple_pdf_re.search(content)
        if pdf_match:
            content = content[:pdf_match.start()] + NEW_PDF_BLOCK + content[pdf_match.end():]
            changes.append('PDF export implemented (simple pattern)')
        else:
            print(f'  ⚠️  PDF pattern not found in {filepath}')

    if content != original:
        open(filepath, 'w', encoding='utf-8').write(content)
        print(f'✅ {filepath} — {", ".join(changes)}')
    else:
        print(f'ℹ️  No changes in {filepath}')

print('\n✅ Done!')
