/**
 * 🧪 ТЕСТ ДЕДУПЛІКАЦІЇ КЛАУЗ
 * Перевіряє правильність витягування та дедуплікації порушень
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 ТЕСТ ДЕДУПЛІКАЦІЇ КЛАУЗ ІНСПЕКЦІЇ');
console.log('═══════════════════════════════════════════════════════════\n');

// Імітуємо клас InspectionReportParser для тестування
class TestClauseParser {
    constructor() {
        this.clauses = [];
    }

    // Імітація витягування клауз з прикладом дублювання
    mockExtractClauses() {
        // Симулюємо що regex знайшов ці клаузи (включаючи дублікати)
        return [
            {
                type: 'C2',
                article: '22.° 3',
                description: 'Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança'
            },
            {
                type: 'C2',
                article: '22.º 2',
                description: 'O acesso à casa das máquinas não é fácil e seguro.'
            },
            {
                type: 'C2',
                article: '74º 2',
                description: 'O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.'
            },
            {
                type: 'C3',
                article: '85º',
                description: 'As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas.'
            },
            // ДУБЛІКАТ: той самий артикул без підрозділу
            {
                type: 'C2',
                article: '22',
                description: '2 – O acesso à casa das máquinas não é fácil e seguro.' // ЦЕЙ ПОВИНЕН БУТИ ВІДФІЛЬТРОВАНИЙ
            }
        ];
    }

    // КРОК 1: Фільтрація неправильних описів
    filterInvalidDescriptions(clauses) {
        console.log('🔍 КРОК 1: ФІЛЬТРАЦІЯ НЕПРАВИЛЬНИХ ОПИСІВ');
        console.log('───────────────────────────────────────────────────────────\n');

        const filtered = clauses.filter(clause => {
            // Перевіряємо чи опис не починається з цифри та тире
            if (/^\d+\s*[–\-—]\s*/.test(clause.description)) {
                console.log(`❌ ВІДФІЛЬТРОВАНО: ${clause.type} Artº.${clause.article}`);
                console.log(`   Причина: опис починається з підрозділу "${clause.description.substring(0, 30)}..."`);
                console.log(`   Це частина більш повної клаузи Artº.${clause.article}.X\n`);
                return false;
            }
            console.log(`✅ ВАЛІДНИЙ: ${clause.type} Artº.${clause.article}`);
            return true;
        });

        console.log(`\n📊 Після фільтрації: ${filtered.length}/${clauses.length} клауз\n`);
        return filtered;
    }

    // КРОК 2: Дедуплікація схожих артикулів
    deduplicateClauses(clauses) {
        console.log('🔍 КРОК 2: ДЕДУПЛІКАЦІЯ СХОЖИХ АРТИКУЛІВ');
        console.log('───────────────────────────────────────────────────────────\n');

        const uniqueClauses = [];
        const seenKeys = new Map();

        for (const clause of clauses) {
            // Нормалізуємо номер артикула
            const normalizedArticle = clause.article.replace(/[°º\s]/g, '');
            const key = `${clause.type}|${normalizedArticle}`;

            // Перевіряємо точний дублікат
            if (seenKeys.has(key)) {
                console.log(`❌ ТОЧНИЙ ДУБЛІКАТ: ${clause.type} Artº.${clause.article}`);
                continue;
            }

            // Перевіряємо частковий дублікат (префікси)
            let isDuplicate = false;
            for (const [existingKey, existingClause] of seenKeys.entries()) {
                if (existingKey.startsWith(clause.type + '|')) {
                    const existingArticle = existingKey.split('|')[1];

                    if (normalizedArticle.startsWith(existingArticle + '.') || 
                        existingArticle.startsWith(normalizedArticle + '.')) {
                        
                        if (normalizedArticle.length > existingArticle.length) {
                            console.log(`🔄 ЗАМІНА: ${existingClause.type} Artº.${existingClause.article} → ${clause.type} Artº.${clause.article}`);
                            console.log(`   Причина: новий артикул більш детальний\n`);
                            seenKeys.delete(existingKey);
                            const index = uniqueClauses.findIndex(c => c === existingClause);
                            if (index !== -1) uniqueClauses.splice(index, 1);
                        } else {
                            console.log(`❌ ДУБЛІКАТ (менш детальний): ${clause.type} Artº.${clause.article}`);
                            console.log(`   Причина: вже є більш детальний ${existingClause.type} Artº.${existingClause.article}\n`);
                            isDuplicate = true;
                            break;
                        }
                    }
                }
            }

            if (!isDuplicate) {
                console.log(`✅ УНІКАЛЬНИЙ: ${clause.type} Artº.${clause.article}\n`);
                seenKeys.set(key, clause);
                uniqueClauses.push(clause);
            }
        }

        console.log(`📊 Після дедуплікації: ${uniqueClauses.length}/${clauses.length} клауз\n`);
        return uniqueClauses;
    }

    // Виконання повного тесту
    runTest() {
        console.log('ПОЧАТКОВІ ДАНІ (з дублікатами):');
        console.log('═══════════════════════════════════════════════════════════');
        const initialClauses = this.mockExtractClauses();
        initialClauses.forEach((clause, i) => {
            console.log(`${i + 1}. ${clause.type} Artº.${clause.article}`);
            console.log(`   ${clause.description.substring(0, 60)}...`);
        });
        console.log(`\n📊 Всього: ${initialClauses.length} клауз\n`);

        // Крок 1: Фільтрація
        const filtered = this.filterInvalidDescriptions(initialClauses);

        // Крок 2: Дедуплікація
        const unique = this.deduplicateClauses(filtered);

        // Фінальний результат
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ ФІНАЛЬНИЙ РЕЗУЛЬТАТ');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        unique.forEach((clause, i) => {
            console.log(`${i + 1}. ${clause.type} Artº.${clause.article}`);
            console.log(`   ${clause.description.substring(0, 70)}...`);
        });

        console.log(`\n📊 СТАТИСТИКА:`);
        console.log(`   Початкових клауз: ${initialClauses.length}`);
        console.log(`   Після фільтрації: ${filtered.length}`);
        console.log(`   Унікальних клауз: ${unique.length}`);
        console.log(`   Видалено дублікатів: ${initialClauses.length - unique.length}`);

        const stats = {
            C1: unique.filter(c => c.type === 'C1').length,
            C2: unique.filter(c => c.type === 'C2').length,
            C3: unique.filter(c => c.type === 'C3').length
        };

        console.log(`\n   За типами:`);
        console.log(`   • C1 (критичні): ${stats.C1}`);
        console.log(`   • C2 (середні): ${stats.C2}`);
        console.log(`   • C3 (легкі): ${stats.C3}`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(unique.length === 4 ? '✅ ТЕСТ ПРОЙДЕНО! Очікувалось 4 клаузи, отримано ' + unique.length : '❌ ТЕСТ ПРОВАЛЕНО!');
        console.log('═══════════════════════════════════════════════════════════\n');

        return unique;
    }
}

// Запуск тесту
const tester = new TestClauseParser();
tester.runTest();
