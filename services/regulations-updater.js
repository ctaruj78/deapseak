// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-UPDATE PORTUGUESE REGULATIONS
// ═══════════════════════════════════════════════════════════
// Автоматично перевіряє нові закони та регуляції з офіційних джерел

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Офіційні джерела законів Португалії
const OFFICIAL_SOURCES = {
    // Diário da República (офіційна газета законів)
    diario: {
        url: 'https://dre.pt/web/guest/pesquisa/-/search/basic',
        name: 'Diário da República',
        description: 'Офіційна публікація законів Португалії'
    },
    
    // DGE (Direção-Geral de Energia e Geologia) - ГОЛОВНИЙ РЕГУЛЯТОР ЛІФТІВ
    dge: {
        url: 'https://www.dgeg.gov.pt',
        name: 'DGE - Direção-Geral de Energia e Geologia',
        description: 'Головний регулятор енергетики та геології, відповідає за ліфти',
        sections: {
            elevators: 'https://www.dgeg.gov.pt/pt/areas-setoriais/equipamentos-sob-pressao-e-elevadores/elevadores/',
            legislation: 'https://www.dgeg.gov.pt/pt/legislacao/',
            inspections: 'https://www.dgeg.gov.pt/pt/areas-setoriais/equipamentos-sob-pressao-e-elevadores/elevadores/inspecoes/'
        }
    },
    
    // ASAE (інспекції та безпека)
    asae: {
        url: 'https://www.asae.gov.pt/inspecao-tecnica/elevadores.aspx',
        name: 'ASAE - Autoridade de Segurança Alimentar e Económica',
        description: 'Інспекції та економічна безпека'
    },
    
    // ACT (трудова інспекція)
    act: {
        url: 'https://www.act.gov.pt/(pt-PT)/Itens/Legislacao/Paginas/default.aspx',
        name: 'ACT - Autoridade para as Condições do Trabalho',
        description: 'Умови праці та безпека працівників'
    }
};

// Відомі регламенти для моніторингу
const KNOWN_REGULATIONS = [
    { number: '513/70', year: 1970, title: 'Regulamento de Segurança dos Ascensores Eléctricos' },
    { number: '320/2002', year: 2002, title: 'Decreto-Lei sobre segurança de elevadores' },
    { number: '163/2006', year: 2006, title: 'Transposição da Diretiva 95/16/CE' },
    { number: '209/2000', year: 2000, title: 'Equipamento eléctrico em atmosferas explosivas' },
    { number: '214/95', year: 1995, title: 'Regulamento sobre elevadores' },
    { number: '139/93', year: 1993, title: 'Regulamento de Segurança contra Incêndio' },
    { number: '46/2006', year: 2006, title: 'Regulamento de segurança em edifícios' }
];

class RegulationsUpdater {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/portugal-lift-regulations.json');
        this.logPath = path.join(__dirname, '../logs/regulations-updates.log');
        this.regulations = null;
    }

    // Завантажити поточну базу даних
    async loadCurrentDatabase() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf-8');
            this.regulations = JSON.parse(data);
            console.log(`✅ Завантажено ${this.regulations.regulations.length} регламентів`);
            return this.regulations;
        } catch (error) {
            console.error('❌ Помилка завантаження БД:', error.message);
            throw error;
        }
    }

    // Записати лог
    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        try {
            await fs.appendFile(this.logPath, logMessage);
            console.log(logMessage.trim());
        } catch (error) {
            console.error('Помилка запису логу:', error.message);
        }
    }

    // Перевірити Diário da República на нові закони
    async checkDiarioRepublica() {
        await this.log('🔍 Перевірка Diário da República...');
        
        // Пошукові терміни
        const searchTerms = [
            'elevadores',
            'ascensores',
            'manutenção elevadores',
            'inspeção elevadores',
            'segurança elevadores'
        ];

        const foundUpdates = [];

        for (const term of searchTerms) {
            await this.log(`   Пошук: "${term}"`);
            
            // TODO: Реалізувати scraping або API виклик
            // Поки що заглушка
            const mockResults = await this.mockSearchDiario(term);
            
            if (mockResults.length > 0) {
                foundUpdates.push(...mockResults);
                await this.log(`   ✅ Знайдено ${mockResults.length} документів`);
            }
        }

        return foundUpdates;
    }

    // Перевірити DGE (Головний регулятор ліфтів)
    async checkDGE() {
        await this.log('🔍 Перевірка DGE (Direção-Geral de Energia e Geologia)...');
        await this.log(`   URL: ${OFFICIAL_SOURCES.dge.url}`);
        
        // Перевірити всі секції DGE
        for (const [key, url] of Object.entries(OFFICIAL_SOURCES.dge.sections)) {
            await this.log(`   📄 Секція "${key}": ${url}`);
            
            // TODO: Реалізувати scraping DGE
            // Важливі сторінки:
            // - Список діючих регламентів
            // - Нові публікації
            // - Зміни в законодавстві
            const mockResults = await this.mockSearchDGE(key);
            
            if (mockResults.length > 0) {
                await this.log(`   ✅ Знайдено ${mockResults.length} оновлень в секції ${key}`);
            }
        }

        return [];
    }

    // Mock функція для DGE (замінити на реальний scraping)
    async mockSearchDGE(section) {
        // Імітація затримки запиту
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Для тестування - повертаємо пусті результати
        // В реальному коді тут буде scraping DGE сайту
        return [];
    }

    // Mock функція для тестування (замінити на реальний scraping)
    async mockSearchDiario(term) {
        // Імітація затримки запиту
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Для тестування - повертаємо пусті результати
        // В реальному коді тут буде scraping або API виклик
        return [];
    }

    // Перевірити чи регламент вже в базі
    isRegulationInDatabase(regulationNumber) {
        return this.regulations.regulations.some(
            reg => reg.number === regulationNumber
        );
    }

    // Додати новий регламент до бази
    async addNewRegulation(regulation) {
        if (this.isRegulationInDatabase(regulation.number)) {
            await this.log(`⚠️  Регламент ${regulation.number} вже існує`);
            return false;
        }

        this.regulations.regulations.push(regulation);
        await this.saveDatabase();
        await this.log(`✅ ДОДАНО НОВИЙ РЕГЛАМЕНТ: ${regulation.number} - ${regulation.title}`);
        
        // Відправити сповіщення адміну
        await this.notifyAdmin(regulation);
        
        return true;
    }

    // Оновити існуючий регламент
    async updateRegulation(regulationNumber, updates) {
        const index = this.regulations.regulations.findIndex(
            reg => reg.number === regulationNumber
        );

        if (index === -1) {
            await this.log(`❌ Регламент ${regulationNumber} не знайдено`);
            return false;
        }

        this.regulations.regulations[index] = {
            ...this.regulations.regulations[index],
            ...updates,
            last_updated: new Date().toISOString()
        };

        await this.saveDatabase();
        await this.log(`✅ ОНОВЛЕНО: ${regulationNumber}`);
        
        return true;
    }

    // Зберегти базу даних
    async saveDatabase() {
        try {
            // Оновити метадані
            this.regulations.metadata = {
                ...this.regulations.metadata,
                last_updated: new Date().toISOString(),
                total_regulations: this.regulations.regulations.length
            };

            const data = JSON.stringify(this.regulations, null, 2);
            await fs.writeFile(this.dataPath, data, 'utf-8');
            await this.log('💾 База даних збережена');
        } catch (error) {
            await this.log(`❌ Помилка збереження БД: ${error.message}`);
            throw error;
        }
    }

    // Відправити сповіщення адміну
    async notifyAdmin(regulation) {
        // TODO: Інтегрувати з email системою
        await this.log(`📧 [TODO] Відправити email адміну про новий закон: ${regulation.number}`);
        
        const notification = {
            type: 'new_regulation',
            regulation: regulation.number,
            title: regulation.title,
            timestamp: new Date().toISOString()
        };

        // Зберегти в файл сповіщень
        const notifPath = path.join(__dirname, '../logs/admin-notifications.json');
        
        try {
            let notifications = [];
            try {
                const data = await fs.readFile(notifPath, 'utf-8');
                notifications = JSON.parse(data);
            } catch (err) {
                // Файл не існує, створимо новий
            }

            notifications.push(notification);
            await fs.writeFile(notifPath, JSON.stringify(notifications, null, 2));
        } catch (error) {
            await this.log(`⚠️  Помилка збереження сповіщення: ${error.message}`);
        }
    }

    // Генерувати звіт про перевірку
    async generateReport(updates) {
        const report = {
            timestamp: new Date().toISOString(),
            total_checked: KNOWN_REGULATIONS.length,
            new_regulations: updates.filter(u => u.type === 'new').length,
            updated_regulations: updates.filter(u => u.type === 'updated').length,
            details: updates
        };

        const reportPath = path.join(__dirname, '../logs/regulations-check-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        await this.log('📊 Звіт створено: regulations-check-report.json');
        return report;
    }

    // Головна функція перевірки оновлень
    async checkForUpdates() {
        await this.log('═══════════════════════════════════════════════════════════');
        await this.log('🚀 ПОЧАТОК ПЕРЕВІРКИ ОНОВЛЕНЬ РЕГЛАМЕНТІВ');
        await this.log('═══════════════════════════════════════════════════════════');

        try {
            // 1. Завантажити поточну базу
            await this.loadCurrentDatabase();

            // 2. Перевірити офіційні джерела
            await this.log('\n📡 ПЕРЕВІРКА ОФІЦІЙНИХ ДЖЕРЕЛ:\n');
            
            // 2.1 DGE (Головний регулятор) - НАЙВАЖЛИВІШЕ
            await this.log(`🏛️  ${OFFICIAL_SOURCES.dge.name}`);
            await this.log(`   ${OFFICIAL_SOURCES.dge.description}`);
            const dgeUpdates = await this.checkDGE();
            
            // 2.2 Diário da República (Офіційна газета)
            await this.log(`\n📰 ${OFFICIAL_SOURCES.diario.name}`);
            const diarioUpdates = await this.checkDiarioRepublica();
            
            // 2.3 ASAE (Інспекції)
            await this.log(`\n🔍 ${OFFICIAL_SOURCES.asae.name}`);
            await this.log(`   Перевірка: ${OFFICIAL_SOURCES.asae.url}`);
            
            // 2.4 ACT (Умови праці)
            await this.log(`\n👮 ${OFFICIAL_SOURCES.act.name}`);
            await this.log(`   Перевірка: ${OFFICIAL_SOURCES.act.url}`);

            const allUpdates = [...dgeUpdates, ...diarioUpdates];

            // 3. Перевірити кожен відомий регламент
            await this.log('\n📋 Перевірка відомих регламентів...');
            for (const reg of KNOWN_REGULATIONS) {
                const isInDB = this.isRegulationInDatabase(reg.number);
                await this.log(`   ${isInDB ? '✅' : '⚠️ '} ${reg.number} - ${reg.title.substring(0, 50)}...`);
            }

            // 4. Генерувати звіт
            const report = await this.generateReport(allUpdates);

            await this.log('\n═══════════════════════════════════════════════════════════');
            await this.log('✅ ПЕРЕВІРКА ЗАВЕРШЕНА');
            await this.log(`📊 Результати: ${report.new_regulations} нових, ${report.updated_regulations} оновлених`);
            await this.log('═══════════════════════════════════════════════════════════\n');

            return report;

        } catch (error) {
            await this.log(`❌ КРИТИЧНА ПОМИЛКА: ${error.message}`);
            await this.log(error.stack);
            throw error;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ЗАПУСК
// ═══════════════════════════════════════════════════════════

if (require.main === module) {
    const updater = new RegulationsUpdater();
    
    updater.checkForUpdates()
        .then(report => {
            console.log('\n✅ Успішно завершено!');
            console.log(`Нових регламентів: ${report.new_regulations}`);
            console.log(`Оновлених: ${report.updated_regulations}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Помилка:', error.message);
            process.exit(1);
        });
}

module.exports = RegulationsUpdater;
