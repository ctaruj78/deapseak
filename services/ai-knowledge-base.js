/**
 * AI ASSISTANT KNOWLEDGE BASE - ІНТЕГРАЦІЯ ЗАКОНІВ
 * ====================================================
 * 
 * Завантажує всі 12 португальських законів для AI асистента
 * Оновлено: 01.01.2026
 * 
 * КРИТИЧНІ ЗМІНИ:
 * ⚠️ Despacho 17/2022: C2 терміни змінені 30 днів → 2 РОКИ!
 */

const regulationsLoader = require('./regulations-loader');

class AIKnowledgeBase {
    constructor() {
        this.regulations = {};
        this.articlesIndex = {};
        this.classificationInfo = {};
        this.loaded = false;
    }

    /**
     * Завантажити базу знань
     */
    async load() {
        if (this.loaded) {
            return this;
        }

        console.log('\n🤖 AI Assistant - Завантаження бази знань...\n');

        try {
            // Завантажити всі закони
            const data = regulationsLoader.exportForAI();
            
            this.regulations = data.regulations;
            this.articlesIndex = data.articlesIndex;
            this.classificationInfo = data.classificationInfo;
            this.summary = data.summary;
            this.quickReference = data.quickReference;

            this.loaded = true;

            console.log(`✅ База знань завантажена:`);
            console.log(`   📚 Законів: ${this.summary.totalRegulations}`);
            console.log(`   📜 Артиклів: ${this.summary.totalArticles}`);
            console.log(`   ⚠️  Критичних змін: ${this.summary.criticalChanges.length}\n`);

            // Показати критичні зміни
            this.summary.criticalChanges.forEach(change => {
                console.log(`   🔴 ${change.law}`);
                console.log(`      ${change.change}`);
                console.log(`      Дата: ${change.date}\n`);
            });

            return this;
        } catch (error) {
            console.error('❌ Помилка завантаження бази знань:', error.message);
            throw error;
        }
    }

    /**
     * Відповісти на питання про закони
     */
    async answerQuestion(question) {
        if (!this.loaded) {
            await this.load();
        }

        const q = question.toLowerCase();

        // Питання про терміни C2
        if (q.includes('c2') && (q.includes('prazo') || q.includes('termo') || q.includes('deadline'))) {
            return this._answerC2Deadline();
        }

        // Питання про класифікацію
        if (q.includes('c1') || q.includes('c2') || q.includes('c3')) {
            const classification = q.includes('c1') ? 'C1' : q.includes('c2') ? 'C2' : 'C3';
            return this._answerClassification(classification);
        }

        // Питання про конкретний артикль
        const articleMatch = q.match(/art(?:igo)?\.?\s*(\d+)/i);
        if (articleMatch) {
            return this._answerArticle(articleMatch[1]);
        }

        // Питання про акредитацію
        if (q.includes('acredit') || q.includes('ipac')) {
            return this._answerAccreditation();
        }

        // Питання про сертифікацію техніків
        if (q.includes('certificaç') || q.includes('técnico') || q.includes('inspector')) {
            return this._answerCertification();
        }

        // Питання про штрафи
        if (q.includes('multa') || q.includes('coima') || q.includes('sanç')) {
            return this._answerPenalties();
        }

        // Загальний пошук
        return this._answerGeneral(question);
    }

    /**
     * Відповідь про терміни C2
     */
    _answerC2Deadline() {
        const c2 = this.classificationInfo.C2;
        
        return {
            answer: `
🔴 **IMPORTANTE: Despacho 17/2022 FOI REVOGADO!**

**Despacho n.º 27/2024 (24 setembro 2024):**
❌ REVOGOU os Despachos 17/2022 e 18/2022
🔙 Sistema VOLTOU às regras anteriores

**Prazos C2 ATUAIS (após 24/09/2024):**

✅ **Prazo estabelecido pelo inspetor** (geralmente 30-90 dias)
❌ **NÃO são mais 2 anos!** (Despacho 17/2022 revogado)

**Legislação aplicável:**
- Portaria 344/93, Art. 6º e 7º
- Decreto-Lei 320/2002
- Decreto 513/70 (elevadores pré-1991)

**Razão da revogação:**
- Consulta pública no Portal Participa (21/05/2024)
- Múltiplas reservas do setor
- Competências pertencem às Câmaras Municipais
- Inadequação ao enquadramento regulamentar atual

**Responsabilidade:**
- Proprietário continua responsável pela segurança
- Correção no prazo definido pelo inspetor
- Coimas: €2.000 - €15.000 se não corrigido

**Referência Legal:**
- Despacho 27/2024, publicado 24/09/2024
- Portaria 344/93
- Decreto-Lei 320/2002, Art. 20º
            `,
            confidence: 1.0,
            sources: ['despacho-27-2024', 'portaria-344-93', 'decreto-lei-320-2002']
        };
    }

    /**
     * Відповідь про класифікацію
     */
    _answerClassification(classification) {
        const info = this.classificationInfo[classification];
        
        if (!info) {
            return {
                answer: 'Classificação não encontrada.',
                confidence: 0
            };
        }

        return {
            answer: `
**${info.name}** (${classification})

**Nível de Risco:** ${info.risk}

**Prazo:** ${info.deadline}
${info.oldDeadline ? `- Prazo antigo: ${info.oldDeadline}` : ''}
${info.additionalRequirement ? `- Requisito: ${info.additionalRequirement}` : ''}
${info.exception ? `- Exceção: ${info.exception}` : ''}

**Ação Necessária:** ${info.action}

**Consequência Legal:** ${info.legalConsequence}

**Referência:** ${info.reference}
            `.trim(),
            confidence: 1.0,
            classification: info
        };
    }

    /**
     * Відповідь про артикль
     */
    _answerArticle(articleNum) {
        // Пошук у всіх законах
        const results = Object.values(this.articlesIndex).filter(article => 
            article.number.includes(articleNum)
        );

        if (results.length === 0) {
            return {
                answer: `Artigo ${articleNum} não encontrado na base de conhecimento.`,
                confidence: 0
            };
        }

        const article = results[0];
        
        return {
            answer: `
**${article.number}: ${article.title}**

${article.text}

**Regulamentação:** ${article.regulationTitle}

${article.keywords ? `**Palavras-chave:** ${article.keywords.join(', ')}` : ''}
            `.trim(),
            confidence: 0.9,
            article: article
        };
    }

    /**
     * Відповідь про акредитацію
     */
    _answerAccreditation() {
        const reg = this.regulations['regulamento-ce-765-2008'];
        
        return {
            answer: `
**Acreditação de Organismos de Inspeção**

**IPAC - Instituto Português de Acreditação**
- Único organismo nacional de acreditação em Portugal
- Website: https://www.ipac.pt

**Requisitos:**
- ISO/IEC 17020 (organismos de inspeção)
- ISO/IEC 17021/17024 (organismos de certificação)
- ISO/IEC 17025 (laboratórios de ensaio)

**⚠️ IMPORTANTE:**
Inspeções por entidades NÃO acreditadas pelo IPAC são NULAS!

**Consequências:**
- Relatório sem valor legal
- Inspeção deve ser repetida
- Coimas: €5.000 - €25.000 para a entidade

**Verificar lista:**
https://www.ipac.pt/pesquisa/organismos.asp

**Referência Legal:**
- Regulamento CE 765/2008, Art. 5º
- Lei 58/2013, Art. 10º
            `.trim(),
            confidence: 1.0,
            sources: ['regulamento-ce-765-2008', 'lei-58-2013']
        };
    }

    /**
     * Відповідь про сертифікацію
     */
    _answerCertification() {
        const reg = this.regulations['decreto-lei-163-2006'];
        
        return {
            answer: `
**Certificação de Técnicos de Elevadores**

**Requisitos Gerais:**
- Habilitações: Mínimo 12º ano
- Formação: 120 horas (instaladores)
- Experiência: 2 anos mínimo
- Exame: Aprovação obrigatória
- Validade: 5 anos (renovável)

**Inspetores (requisitos adicionais):**
- Certificação de técnico de manutenção
- +80 horas formação em inspeção
- 3 anos experiência em manutenção
- Formação contínua: 16 horas/ano
- Trabalhar para entidade acreditada IPAC

**Registo:**
- RNTE - Registo Nacional de Técnicos de Elevadores
- Gerido pela DGEG
- Consulta pública disponível

**Sanções:**
- Técnico sem certificação: €1.000 - €5.000
- Inspeções inválidas se técnico não certificado
- Suspensão até 2 anos
- Cancelamento definitivo em casos graves

**Referência Legal:**
- Decreto-Lei 163/2006, Art. 3º (requisitos)
- Decreto-Lei 163/2006, Art. 5º (inspetores)
- Decreto-Lei 163/2006, Art. 10º (sanções)
            `.trim(),
            confidence: 1.0,
            sources: ['decreto-lei-163-2006']
        };
    }

    /**
     * Відповідь про штрафи
     */
    _answerPenalties() {
        const lei58 = this.regulations['lei-58-2013'];
        
        return {
            answer: `
**Coimas e Sanções - Elevadores**

**Sem Marcação CE:**
- €5.000 - €25.000
- Retirada obrigatória do mercado

**Sem Inspeção Periódica:**
- €1.000 - €10.000
- Possível imobilização do elevador

**Sem Manutenção Adequada:**
- €500 - €5.000
- Ordem de manutenção imediata

**Não Imobilizar C1:**
- €2.000 - €15.000
- Responsabilidade criminal por acidentes

**Não Notificar Acidente:**
- €3.000 - €20.000
- Investigação obrigatória
- Possível processo criminal

**Acidente com Vítimas:**
- Agravamento até ao dobro
- Responsabilidade criminal do proprietário
- Publicação pública da condenação
- Possível encerramento de instalações

**Entidade Não Acreditada:**
- €5.000 - €25.000
- Relatórios considerados nulos

**Referência Legal:**
- Lei 58/2013, Art. 11º (coimas)
- Lei 58/2013, Art. 13º (agravamento)
- Decreto-Lei 320/2002 (infrações específicas)
            `.trim(),
            confidence: 1.0,
            sources: ['lei-58-2013', 'decreto-lei-320-2002']
        };
    }

    /**
     * Пошук загальний
     */
    _answerGeneral(question) {
        const results = regulationsLoader.searchArticles(question);
        
        if (results.length === 0) {
            return {
                answer: 'Não encontrei informação específica sobre isso. Pode reformular a pergunta?',
                confidence: 0
            };
        }

        const best = results[0];
        
        return {
            answer: `
**${best.number}: ${best.title}**

${best.text}

**Regulamentação:** ${best.regulationTitle}

*Relevância: ${(best.relevance * 100).toFixed(0)}%*

**Ver também:**
${results.slice(1, 3).map(r => `- ${r.number}: ${r.title}`).join('\n')}
            `.trim(),
            confidence: best.relevance,
            results: results.slice(0, 5)
        };
    }

    /**
     * Отримати швидку довідку
     */
    getQuickReference() {
        return this.quickReference;
    }

    /**
     * Отримати summary
     */
    getSummary() {
        return this.summary;
    }
}

// Export singleton
let instance = null;

module.exports = {
    getInstance: function() {
        if (!instance) {
            instance = new AIKnowledgeBase();
        }
        return instance;
    },
    
    load: async function() {
        const kb = this.getInstance();
        await kb.load();
        return kb;
    },
    
    answerQuestion: async function(question) {
        const kb = this.getInstance();
        if (!kb.loaded) {
            await kb.load();
        }
        return kb.answerQuestion(question);
    }
};
