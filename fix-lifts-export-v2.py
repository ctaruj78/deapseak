#!/usr/bin/env python3
"""
fix-lifts-export-v2.py — Точна заміна CSV та PDF export у lifts.html файлах
"""

NEW_CSV_CODE = """                    // ✅ CSV melhorado — colunas úteis
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

NEW_PDF_CODE = """                // ✅ PDF export via jsPDF + autoTable
                (async function exportPDF() {
                    const btn = exportPDFBtn;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> A gerar PDF...';
                    try {
                        // Carregar jsPDF dinamicamente se necessário
                        if (typeof window.jspdf === 'undefined') {
                            await new Promise((resolve, reject) => {
                                const s = document.createElement('script');
                                s.src = '/node_modules/jspdf/dist/jspdf.umd.min.js';
                                s.onload = resolve;
                                s.onerror = () => reject(new Error('Erro ao carregar jsPDF'));
                                document.head.appendChild(s);
                            });
                        }
                        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF.prototype.autoTable === 'undefined') {
                            await new Promise((resolve, reject) => {
                                const s = document.createElement('script');
                                s.src = '/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js';
                                s.onload = resolve;
                                s.onerror = () => reject(new Error('Erro ao carregar AutoTable'));
                                document.head.appendChild(s);
                            });
                        }

                        let lifts = window.allLiftsData;
                        if (!lifts || lifts.length === 0) {
                            lifts = await window.loadLiftsFromAPI();
                        }
                        if (!lifts || lifts.length === 0) {
                            alert('Sem dados para exportar');
                            return;
                        }

                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

                        // Cabeçalho
                        doc.setFontSize(16);
                        doc.setFont('helvetica', 'bold');
                        doc.text('FestLift \u2014 Gestão de Elevadores', 14, 14);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        const hoje = new Date().toLocaleDateString('pt-PT');
                        doc.text(`Exportado em: ${hoje}   ·   Total: ${lifts.length} elevadores`, 14, 21);

                        const typeLabels = { passenger: 'Passageiro', cargo: 'Carga', car: 'Automovel', escalator: 'Escada Rolante', platform: 'Plataforma' };
                        const statusLabels = { operational: 'Operacional', maintenance: 'Manutencao', inactive: 'Inativo', inspection_required: 'Insp. Necessaria', 'out-of-service': 'Fora Servico' };

                        const tableData = lifts.map(lift => {
                            let addr = '-';
                            if (lift.address) {
                                if (typeof lift.address === 'string') addr = lift.address;
                                else addr = [lift.address.street, lift.address.city].filter(Boolean).join(', ') || '-';
                            }
                            const municipio = lift.municipality || (lift.address && lift.address.city) || '-';
                            const lastInsp = lift.lastInspectionDate ? new Date(lift.lastInspectionDate).toLocaleDateString('pt-PT') : '-';
                            const nextInsp = lift.nextInspectionDate ? new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT') : '-';
                            return [
                                lift.municipalNumber || lift.name || '-',
                                typeLabels[lift.type] || lift.type || '-',
                                lift.manufacturer || '-',
                                lift.model || '-',
                                addr,
                                municipio,
                                statusLabels[lift.status] || lift.status || '-',
                                lift.clientName || '-',
                                lastInsp,
                                nextInsp,
                            ];
                        });

                        doc.autoTable({
                            head: [['N\\u00ba Municipal', 'Tipo', 'Fabricante', 'Modelo', 'Endere\\u00e7o', 'Munic\\u00edpio', 'Estado', 'Cliente', '\\u00dalt. Inspe\\u00e7\\u00e3o', 'Pr\\u00f3x. Inspe\\u00e7\\u00e3o']],
                            body: tableData,
                            startY: 26,
                            styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
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
                                doc.setFontSize(8);
                                doc.setTextColor(150);
                                doc.text(`Pagina ${data.pageNumber}`, W - 22, H - 6);
                                doc.setTextColor(0);
                            }
                        });

                        doc.save(`gestao_elevadores_${new Date().toISOString().slice(0, 10)}.pdf`);
                        if (typeof toastr !== 'undefined') toastr.success('PDF exportado com sucesso!');

                    } catch (err) {
                        console.error('Erro ao gerar PDF:', err);
                        if (typeof toastr !== 'undefined') toastr.error('Erro ao gerar PDF: ' + err.message);
                        else alert('Erro ao gerar PDF: ' + err.message);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-file-pdf mr-1"></i> Exportar PDF';
                    }
                })();"""

# CSV old block - unique part that identifies it in all files
CSV_ANCHOR_START = "// Формуexisteмо CSV\n"
CSV_ANCHOR_END = "csvRows.push(row.join(','));\n                    });"

# PDF old texts in each file
PDF_ANCHORS = [
    # admin/lifts.html
    "alert('A exportação PDF estará disponível na próxima versão.\\n\\nPor enquanto, utilize a exportação CSV.');\n                // TODO: Adicionar jsPDF бібліотеку e реалізувати експорт PDF",
    # dispatcher/lifts.html (same)
    "alert('Exportar PDF estará disponível na próxima versão.\\n\\nPor enquanto use a exportação CSV.');\n                // TODO: Adicionar jsPDF бібліотеку e реалізувати експорт PDF",
]

FILES = [
    'pages/admin/lifts.html',
    'pages/dispatcher/lifts.html',
    'pages/dispatcher/lifts-admin-style.html',
]

for filepath in FILES:
    content = open(filepath, 'r', encoding='utf-8').read()
    original = content
    changes = []

    # ── Fix CSV ──────────────────────────────────────────────────────
    # Find CSV start/end anchors and replace everything between them
    csv_start_idx = content.find(CSV_ANCHOR_START)
    if csv_start_idx >= 0:
        csv_end_idx = content.find(CSV_ANCHOR_END, csv_start_idx)
        if csv_end_idx >= 0:
            csv_end_idx += len(CSV_ANCHOR_END)
            # Get indentation from surrounding
            content = content[:csv_start_idx] + NEW_CSV_CODE.lstrip() + "\n" + content[csv_end_idx:]
            changes.append('CSV melhorado')
        else:
            print(f'  ⚠️  CSV end anchor não encontrado em {filepath}')
    else:
        print(f'  ⚠️  CSV start anchor não encontrado em {filepath}')

    # ── Fix PDF ──────────────────────────────────────────────────────
    pdf_fixed = False
    for pdf_old in PDF_ANCHORS:
        if pdf_old in content:
            content = content.replace(pdf_old, NEW_PDF_CODE.strip())
            changes.append('PDF export implementado')
            pdf_fixed = True
            break
    
    if not pdf_fixed:
        # Try a broader search
        import re
        m = re.search(r"alert\('.*?exportação PDF.*?'\);\s*\n\s*// TODO: Adicionar jsPDF.*", content)
        if m:
            content = content[:m.start()] + NEW_PDF_CODE.strip() + content[m.end():]
            changes.append('PDF export implementado (broad)')
            pdf_fixed = True
        else:
            print(f'  ⚠️  PDF anchor não encontrado em {filepath}')

    if content != original:
        open(filepath, 'w', encoding='utf-8').write(content)
        print(f'✅ {filepath}: {", ".join(changes)}')
    else:
        print(f'ℹ️  Sem mudanças: {filepath}')

print('\n✅ Concluído!')
