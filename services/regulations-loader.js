/**
 * Regulations Loader - Завантажувач Португальських Законів
 * ===========================================================
 * 
 * Завантажує всі 12 законів з data/regulations/ для AI асистента
 * 
 * Закони:
 * 1. Decreto 513/70 - Base segurança
 * 2. DL 320/2002 - Manutenção e inspeções
 * 3. DL 295/98 - Marcação CE
 * 4. DR 13/80 - Requisitos técnicos
 * 5. Directiva 95/16/CE - Directiva EU
 * 6. Portaria 344/93 - Procedimentos inspeção
 * 7. Despacho 17/2022 - NOVO! C2 prazos: 30 dias → 2 ANOS
 * 8. DL 163/2006 - Certificação técnicos
 * 9. Lei 58/2013 - Segurança equipamentos
 * 10. EN 81-20:2020 - Norma europeia
 * 11. EN 81-50:2020 - Exames e testes
 * 12. Regulamento CE 765/2008 - Acreditação
 */

const fs = require('fs');
const path = require('path');

class RegulationsLoader {
    constructor() {
        this.regulationsPath = path.join(__dirname, '../data/regulations');
        this.regulations = {};
        this.articlesIndex = {};
        this.loaded = false;
    }

    /**
     * Завантажити всі закони
     */
    loadAll() {
        if (this.loaded) {
            return this.regulations;
        }

        console.log('📚 Завантаження португальських законів...');

        const files = [
            'decreto-513-70.json',
            'decreto-lei-320-2002.json',
            'decreto-lei-295-98.json',
            'decreto-regulamentar-13-80.json',
            'directiva-95-16-ce.json',
            'portaria-344-93.json',
            'despacho-17-2022.json',         // 🆕 КРИТИЧНИЙ!
            'decreto-lei-163-2006.json',     // 🆕
            'lei-58-2013.json',              // 🆕
            'en-81-20-2020.json',            // 🆕
            'en-81-50-2020.json',            // 🆕
            'regulamento-ce-765-2008.json'   // 🆕
        ];

        let loadedCount = 0;
        let totalArticles = 0;

        files.forEach(filename => {
            try {
                const filePath = path.join(this.regulationsPath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const regulation = JSON.parse(content);
                    
                    this.regulations[regulation.id] = regulation;
                    
                    // Індексувати артикли для швидкого пошуку
                    if (regulation.articles) {
                        regulation.articles.forEach(article => {
                            const key = `${regulation.id}:${article.number}`;
                            this.articlesIndex[key] = {
                                regulation: regulation.id,
                                regulationTitle: regulation.title,
                                ...article
                            };
                            totalArticles++;
                        });
                    }
                    
                    loadedCount++;
                    console.log(`  ✅ ${regulation.title}`);
                } else {
                    console.warn(`  ⚠️  Файл не знайдено: ${filename}`);
                }
            } catch (error) {
                console.error(`  ❌ Помилка завантаження ${filename}:`, error.message);
            }
        });

        this.loaded = true;
        console.log(`\n📊 Завантажено: ${loadedCount}/12 законів, ${totalArticles} артиклів\n`);

        return this.regulations;
    }

    /**
     * Отримати закон за ID
     */
    getRegulation(id) {
        if (!this.loaded) this.loadAll();
        return this.regulations[id];
    }

    /**
     * Знайти артикль за номером
     */
    findArticle(regulationId, articleNumber) {
        if (!this.loaded) this.loadAll();
        
        const key = `${regulationId}:${articleNumber}`;
        return this.articlesIndex[key];
    }

    /**
     * Пошук артиклів за ключовими словами
     */
    searchArticles(keywords) {
        if (!this.loaded) this.loadAll();
        
        const results = [];
        const searchTerms = keywords.toLowerCase().split(' ');

        Object.values(this.articlesIndex).forEach(article => {
            const searchText = `
                ${article.number} 
                ${article.title} 
                ${article.text} 
                ${article.keywords ? article.keywords.join(' ') : ''}
            `.toLowerCase();

            const matches = searchTerms.filter(term => searchText.includes(term));
            
            if (matches.length > 0) {
                results.push({
                    ...article,
                    relevance: matches.length / searchTerms.length
                });
            }
        });

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Отримати інформацію про терміни C1/C2/C3
     */
    getClassificationInfo() {
        return {
            C1: {
                name: 'Cláusula Tipo 1',
                risk: 'Elevado risco',
                deadline: 'Imobilização imediata',
                action: 'DESATIVAR ELEVADOR IMEDIATAMENTE',
                legalConsequence: 'Responsabilidade criminal em caso de acidente',
                reference: 'Portaria 344/93, Art. 6º'
            },
            C2: {
                name: 'Cláusula Tipo 2',
                risk: 'Médio risco',
                deadline: '2 anos (anteriormente 30 dias)',
                criticalChange: '⚠️ ALTERAÇÃO REVOLUCIONÁRIA: Despacho 17/2022/DG',
                oldDeadline: '30 dias (antes de 28/04/2022)',
                newDeadline: '2 ANOS (desde 28/04/2022)',
                additionalRequirement: 'Inspeção de acompanhamento obrigatória ao 1 ano',
                exception: 'NÃO se aplica se houver C1 no mesmo elevador',
                action: 'Correção no prazo de 2 anos',
                legalConsequence: 'Coima €2.000-€15.000 após 2 anos',
                reference: 'Portaria 344/93, Art. 7º + Despacho 17/2022/DG, Art. 1º'
            },
            C3: {
                name: 'Cláusula Tipo 3',
                risk: 'Baixo risco',
                deadline: 'Até próxima inspeção periódica',
                action: 'Incluir em manutenção programada',
                legalConsequence: 'Advertência possível',
                reference: 'Portaria 344/93, Art. 6º'
            }
        };
    }

    /**
     * Отримати список всіх законів
     */
    getAllRegulations() {
        if (!this.loaded) this.loadAll();
        
        return Object.values(this.regulations).map(reg => ({
            id: reg.id,
            title: reg.title,
            date: reg.date,
            priority: reg.priority,
            articlesCount: reg.articles ? reg.articles.length : 0,
            scope: reg.scope
        }));
    }

    /**
     * Отримати закони за пріоритетом
     */
    getByPriority(priority) {
        if (!this.loaded) this.loadAll();
        
        return Object.values(this.regulations)
            .filter(reg => reg.priority === priority)
            .sort((a, b) => a.title.localeCompare(b.title));
    }

    /**
     * Перевірити чи закон містить інформацію про певне порушення
     */
    hasViolationInfo(regulationId, violationType) {
        const regulation = this.getRegulation(regulationId);
        
        if (!regulation || !regulation.violations_examples) {
            return false;
        }

        return regulation.violations_examples.some(v => 
            v.description.toLowerCase().includes(violationType.toLowerCase())
        );
    }

    /**
     * Отримати приклади порушень за класифікацією
     */
    getViolationExamples(classification) {
        if (!this.loaded) this.loadAll();
        
        const examples = [];

        Object.values(this.regulations).forEach(reg => {
            if (reg.violations_examples) {
                const filtered = reg.violations_examples.filter(v => 
                    v.classification === classification || 
                    (v.classification && v.classification.includes(classification))
                );
                
                filtered.forEach(v => {
                    examples.push({
                        regulation: reg.title,
                        regulationId: reg.id,
                        ...v
                    });
                });
            }
        });

        return examples;
    }

    /**
     * Експорт для AI асистента
     */
    exportForAI() {
        if (!this.loaded) this.loadAll();

        return {
            regulations: this.regulations,
            articlesIndex: this.articlesIndex,
            classificationInfo: this.getClassificationInfo(),
            summary: {
                totalRegulations: Object.keys(this.regulations).length,
                totalArticles: Object.keys(this.articlesIndex).length,
                criticalChanges: [
                    {
                        law: 'Despacho 17/2022/DG',
                        change: 'C2 prazos alterados: 30 dias → 2 ANOS',
                        date: '28/04/2022',
                        impact: 'REVOLUCIONÁRIO - afeta todos os elevadores em Portugal'
                    }
                ]
            },
            quickReference: {
                c1_deadline: 'Imediato',
                c2_deadline: '2 anos (com inspeção ao 1 ano)',
                c3_deadline: 'Até próxima inspeção',
                inspection_frequency: 'Anual (>10 anos) ou Bienal (≤10 anos)',
                maintenance_frequency: 'Mensal (elevadores passageiros)',
                accreditation_body: 'IPAC - Instituto Português de Acreditação'
            }
        };
    }
}

// Singleton instance
let instance = null;

module.exports = {
    /**
     * Отримати інстанс завантажувача
     */
    getInstance: function() {
        if (!instance) {
            instance = new RegulationsLoader();
        }
        return instance;
    },

    /**
     * Швидкий доступ до завантаження
     */
    loadRegulations: function() {
        return this.getInstance().loadAll();
    },

    /**
     * Швидкий доступ до класифікації
     */
    getClassificationInfo: function() {
        return this.getInstance().getClassificationInfo();
    },

    /**
     * Швидкий доступ до пошуку
     */
    searchArticles: function(keywords) {
        return this.getInstance().searchArticles(keywords);
    },

    /**
     * Експорт для AI
     */
    exportForAI: function() {
        return this.getInstance().exportForAI();
    }
};
