/**
 * 🧪 ТЕСТ ПАРСИНГУ IEP ЗВІТУ
 * Перевіряє правильність витягування порушень з звіту IEP Portugal
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 ТЕСТ ПАРСИНГУ ЗВІТУ IEP PORTUGAL');
console.log('═══════════════════════════════════════════════════════════\n');

// Імітуємо текст з реального звіту IEP
const iepReportText = `
ASSUNTO:Envio de resultado dos trabalhos de Inspeção de Elevador
Processo: CML/4901/9749
Local da instalação: Avenida Duque Ávila, nº 42

Nota de Cláusulas

C2 | DL. 320/2002 (Artº 20º) - Falta de apresentação dos documentos referentes à modificação importante efetuada nesta instalação,
conforme definido no Anexo I do Decreto-lei n.° 58/2017, de 9 de Junho e Norma EN 13015:2001+A1:2008.
( Quadro de comando - 2018 ; fechadura de patamar - 2018 )

C2 | DL. 513/70 (Artº 64º-1) - Não existe a proteção para evitar que os cabos saltem dos gornes e a possibilidade de alojamento de
corpos estranhos entre os gornes e os cabos ou cadeias.
( roda de tração e desvio)

C2 | DL. 513/70 (Artº 16º-2 ) - Com o contrapeso em repouso sobre os pára-choques (amortecedores) completamente comprimidos, a
altura livre expressa em metros acima da cobertura é inferior a 1+0,035V^2 (m) com V a velocidade nominal do elevador em m/s.

C3 | DL. 513/70 (Artº 44º-2) - Os materiais utilizados na constituição da cabina são perigosos pela sua inflamabilidade ou pela natureza
e volume dos gases e fumos libertados em caso de incêndio.
( porta em madeira)

C3 | DL. 513/70 (Artº 25º-2 ) - A porta da casa da máquina abre para dentro.

C3 | DL. 513/70 (Artº 85º-) - As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente
resguardadas.

C3 | DL. 513/70 (Artº 6º) - Os elementos ou materiais constituintes dos elevadores não garantem o funcionamento regular destes.
( O botão da cabina de fecho de portas está inoperacional)

C3 | DL. 513/70 (Artº 6º) - Os elementos ou materiais constituintes dos elevadores não garantem o funcionamento regular destes.
(Não existe escada para acesso ao poço)

Notas:
C1 – Correspondente a situações de elevado risco para a segurança de pessoas e bens, cuja resolução deve ser imediata. Estas
cláusulas dão lugar à imobilização das instalações.
C2 – Correspondente a situações de médio risco para a segurança de pessoas e bens. Estas cláusulas não obrigam à imobilização das
instalações.
C3 – Correspondente a situações que não representam um risco direto para segurança das pessoas e bens, cuja resolução deve ser
verificada na inspeção periódica seguinte.

Instalações de elevação em Portugal Continental
Cláusulas do tipo C2, cumprir no prazo máximo de 30 dias, de
acordo com o Decreto-Lei nº 320/2002 de 28 de dezembro.
`;

// Симулюємо роботу парсера
class TestIEPParser {
    extractClauses(text) {
        const clauses = [];
        
        // Видаляємо секцію "Notas:" та все після неї
        let clauseSection = text;
        const notasIndex = clauseSection.search(/\nNotas:/i);
        if (notasIndex !== -1) {
            console.log('🚫 Видаляємо секцію Notas та все після неї');
            clauseSection = clauseSection.substring(0, notasIndex);
        }

        // IEP формат regex - МАКСИМАЛЬНО ПРОСТИЙ і УНІВЕРСАЛЬНИЙ
        // Шукає: "C2 | будь-що (Artº номер) - опис"
        const clausePatternIEP = /(C[123])\s*\|[^(]*\(\s*Artº?\s*([\d]+[\dº.,\s-]*)\s*\)\s*[-–—]\s*([\s\S]+?)(?=\s*C[123]\s*\||Notas:|$)/gi;

        console.log('📝 Текст для парсингу (перші 500 символів):');
        console.log(clauseSection.substring(0, 500));
        console.log('\n---\n');

        let match;
        let clauseCount = 0;

        while ((match = clausePatternIEP.exec(clauseSection)) !== null) {
            const clauseType = match[1].toUpperCase();
            const articleNumber = match[2].trim();
            let description = match[3].trim();

            // Фільтри
            if (!/^\d+/.test(articleNumber)) {
                console.log(`⚠️ Пропуск: артикул "${articleNumber}" не є числом`);
                continue;
            }

            const metaTextPatterns = [
                /foram\s+detetadas?\s+cláusulas?\s+tipo/i,
                /correspondem\s+a\s+situações/i,
                /cumprir\s+no\s+prazo\s+máximo/i
            ];

            if (metaTextPatterns.some(pattern => pattern.test(description))) {
                console.log(`⚠️ Пропуск: метатекст`);
                continue;
            }

            let cleanDescription = description
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();

            // Видаляємо текст в дужках на початку
            cleanDescription = cleanDescription.replace(/^\([^)]*\)\s*/, '');

            if (cleanDescription.length < 10) {
                console.log(`⚠️ Пропуск: опис занадто короткий`);
                continue;
            }

            clauseCount++;

            clauses.push({
                type: clauseType,
                article: articleNumber,
                description: cleanDescription
            });

            console.log(`✅ Клауза #${clauseCount}: ${clauseType} Artº.${articleNumber}`);
            console.log(`   ${cleanDescription.substring(0, 70)}...`);
        }

        return clauses;
    }

    deduplicateClauses(clauses) {
        const uniqueClauses = [];
        const seenKeys = new Map();

        for (const clause of clauses) {
            const normalizedArticle = clause.article.replace(/[°º\s-]/g, '');
            const key = `${clause.type}|${normalizedArticle}`;

            // Точний дублікат
            if (seenKeys.has(key)) {
                console.log(`❌ ДУБЛІКАТ: ${clause.type} Artº.${clause.article}`);
                continue;
            }

            // Частковий дублікат
            let isDuplicate = false;
            for (const [existingKey, existingClause] of seenKeys.entries()) {
                if (existingKey.startsWith(clause.type + '|')) {
                    const existingArticle = existingKey.split('|')[1];

                    if (normalizedArticle === existingArticle) {
                        console.log(`❌ ТОЧНИЙ ДУБЛІКАТ: ${clause.type} Artº.${clause.article}`);
                        isDuplicate = true;
                        break;
                    } else if (normalizedArticle.startsWith(existingArticle + '.') || 
                        existingArticle.startsWith(normalizedArticle + '.')) {
                        
                        if (normalizedArticle.length > existingArticle.length) {
                            console.log(`🔄 ЗАМІНА: ${existingClause.article} → ${clause.article}`);
                            seenKeys.delete(existingKey);
                            const index = uniqueClauses.findIndex(c => c === existingClause);
                            if (index !== -1) uniqueClauses.splice(index, 1);
                        } else {
                            console.log(`❌ ДУБЛІКАТ (менш детальний): ${clause.article}`);
                            isDuplicate = true;
                            break;
                        }
                    }
                }
            }

            if (!isDuplicate) {
                seenKeys.set(key, clause);
                uniqueClauses.push(clause);
            }
        }

        return uniqueClauses;
    }

    runTest() {
        console.log('КРОК 1: ВИТЯГУВАННЯ КЛАУЗ');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        const extracted = this.extractClauses(iepReportText);
        
        console.log(`\n📊 Витягнуто клауз: ${extracted.length}\n`);

        console.log('КРОК 2: ДЕДУПЛІКАЦІЯ');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        const unique = this.deduplicateClauses(extracted);

        console.log(`\n📊 Після дедуплікації: ${unique.length}\n`);

        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ ФІНАЛЬНИЙ РЕЗУЛЬТАТ');
        console.log('═══════════════════════════════════════════════════════════\n');

        unique.forEach((clause, i) => {
            console.log(`${i + 1}. ${clause.type} Artº.${clause.article}`);
            console.log(`   ${clause.description.substring(0, 80)}...`);
        });

        const stats = {
            C1: unique.filter(c => c.type === 'C1').length,
            C2: unique.filter(c => c.type === 'C2').length,
            C3: unique.filter(c => c.type === 'C3').length
        };

        console.log(`\n📊 СТАТИСТИКА:`);
        console.log(`   Початкових клауз: ${extracted.length}`);
        console.log(`   Після дедуплікації: ${unique.length}`);
        console.log(`   Видалено дублікатів: ${extracted.length - unique.length}`);
        console.log(`\n   За типами:`);
        console.log(`   • C1 (критичні): ${stats.C1}`);
        console.log(`   • C2 (середні): ${stats.C2} ← очікується 3`);
        console.log(`   • C3 (легкі): ${stats.C3} ← очікується 4`);

        const expectedTotal = 7;
        const passed = unique.length === expectedTotal && stats.C2 === 3 && stats.C3 === 4;

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(passed ? '✅ ТЕСТ ПРОЙДЕНО!' : '❌ ТЕСТ ПРОВАЛЕНО!');
        console.log(`   Очікувалось: ${expectedTotal} клауз (3 C2 + 4 C3)`);
        console.log(`   Отримано: ${unique.length} клауз (${stats.C2} C2 + ${stats.C3} C3)`);
        console.log('═══════════════════════════════════════════════════════════\n');

        return unique;
    }
}

// Запуск тесту
const tester = new TestIEPParser();
tester.runTest();
