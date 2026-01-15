/**
 * Модуль для парсингу PDF звітів інспекції та витягування клауз
 * Працює з португальськими звітами BUREAU VERITAS RINAVE
 */
class InspectionReportParser {
    constructor() {
        this.pdfLib = null;
        this.initialized = false;
    }

    /**
     * Ініціалізація PDF.js бібліотеки
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Перевіряємо наявність PDF.js
            if (typeof pdfjsLib === 'undefined') {
                console.warn('⚠️ PDF.js не завантажено, парсинг PDF недоступний');
                return false;
            }

            this.pdfLib = pdfjsLib;
            // Налаштування worker path якщо потрібно
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            
            this.initialized = true;
            console.log('✅ Inspection Report Parser ініціалізовано');
            return true;
        } catch (error) {
            console.error('❌ Помилка ініціалізації парсера:', error);
            return false;
        }
    }

    /**
     * Парсинг PDF файлу і витягування тексту
     * @param {File} file - PDF файл
     * @returns {Promise<string>} - Текст з PDF
     */
    async extractTextFromPDF(file) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.pdfLib) {
            throw new Error('PDF.js не доступний');
        }

        try {
            console.log('📄 Читання PDF файлу:', file.name);

            // Читаємо файл як ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Завантажуємо PDF документ
            const loadingTask = this.pdfLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            console.log(`📖 PDF завантажено. Сторінок: ${pdf.numPages}`);

            let fullText = '';

            // Обробляємо кожну сторінку
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Збираємо текст зі сторінки
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
                
                console.log(`✅ Сторінка ${pageNum}/${pdf.numPages} оброблена`);
            }

            console.log('✅ Текст витягнуто з PDF');
            return fullText;

        } catch (error) {
            console.error('❌ Помилка читання PDF:', error);
            throw error;
        }
    }

    /**
     * Витягує клаузи з тексту звіту інспекції
     * @param {string} text - Текст звіту
     * @returns {Array} - Масив клауз
     */
    extractClausesFromText(text) {
        console.log('🔍 Починаємо витягування клауз з тексту...');
        console.log('📝 Довжина тексту:', text.length);

        const clauses = [];

        // КРИТИЧНО: Шукаємо секцію "NOTA DE CLAUSULAS" або "NOTA DE CLÁUSULAS"
        // Це основна секція де перелічені всі клаузи
        // ВАЖЛИВО: Секція закінчується перед "RESULTADO DA INSPECÇÃO"
        const clauseSectionRegex = /NOTA DE CL[AÁ]USULAS?\s*(.*?)(?=RESULTADO DA INSPEC[ÇC][ÃA]O)/is;
        const clauseSectionMatch = text.match(clauseSectionRegex);

        if (!clauseSectionMatch) {
            console.log('⚠️ Секція NOTA DE CLAUSULAS не знайдена');
            return clauses;
        }

        let clauseSection = clauseSectionMatch[1];
        console.log('✅ Знайдена секція NOTA DE CLAUSULAS');
        console.log('📋 Довжина секції:', clauseSection.length);
        
        // КРИТИЧНО: Видаляємо секцію "OBRIGAÇÕES DO PROPRIETÁRIO" якщо вона потрапила
        // Ця секція містить пояснення про типи клауз і НЕ є реальними порушеннями
        const obligationsStart = clauseSection.search(/OBRIGA[ÇC][ÕO]ES\s+DO\s+PROPRIET[ÁA]RIO/i);
        if (obligationsStart !== -1) {
            console.log('🚫 Видаляємо секцію OBRIGAÇÕES DO PROPRIETÁRIO');
            clauseSection = clauseSection.substring(0, obligationsStart);
            console.log('📋 Нова довжина секції:', clauseSection.length);
        }
        
        // КРИТИЧНО: Видаляємо також секцію пояснень що починається з "EM RELAÇÃO"
        const explanationStart = clauseSection.search(/EM RELA[ÇC][ÃA]O AO N[ÍI]VEL/i);
        if (explanationStart !== -1) {
            console.log('🚫 Видаляємо секцію пояснень EM RELAÇÃO');
            clauseSection = clauseSection.substring(0, explanationStart);
            console.log('📋 Нова довжина секції:', clauseSection.length);
        }

        // ПОКРАЩЕНИЙ REGEX: Витягуємо клаузи типу C1, C2, C3 з артикулом та описом
        // Формат: "C2 Artº.46.º 2 – O dispositivo contra entalamentos..."
        // ВАЖЛИВО: Артикул ПОВИНЕН бути числом, а не словом типо "NOTA"
        const clausePattern = /\b(C[123])\s+(?:Art[ºo.]+\s*)?(\d+(?:[.,º\s]+\d+)*)\s*[–\-—]\s*(.+?)(?=\n\s*C[123]\s|$)/gis;

        let match;
        let clauseCount = 0;

        while ((match = clausePattern.exec(clauseSection)) !== null) {
            const clauseType = match[1].toUpperCase(); // C1, C2, або C3
            const articleNumber = match[2].trim();
            let description = match[3].trim();

            // ФІЛЬТРУЄМО неправильні співпадіння:
            
            // 1. Перевіряємо чи артикул - це число (не "NOTA" чи інше слово)
            if (!/^\d+/.test(articleNumber)) {
                console.log(`⚠️ Пропускаємо: артикул "${articleNumber}" не є числом`);
                continue;
            }
            
            // 2. Перевіряємо чи опис не містить метатекст про типи клауз
            const metaTextPatterns = [
                /foram\s+detetadas?\s+cl[áa]usulas?\s+tipo/i,
                /correspondem\s+a\s+situa[çc][õo]es/i,
                /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
                /d[ãa]o\s+lugar\s+a\s+uma\s+reinspec[çc][ãa]o/i
            ];
            
            const isMetaText = metaTextPatterns.some(pattern => pattern.test(description));
            if (isMetaText) {
                console.log(`⚠️ Пропускаємо метатекст: "${description.substring(0, 50)}..."`);
                continue;
            }
            
            // 3. Обрізаємо опис якщо він містить секцію RESULTADO
            const resultadoIndex = description.search(/RESULTADO DA INSPEC[ÇC][ÃA]O/i);
            if (resultadoIndex !== -1) {
                description = description.substring(0, resultadoIndex);
            }

            // Очищуємо опис від зайвих пробілів та переносів
            const cleanDescription = description
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();
            
            // Перевіряємо чи опис не пустий після очищення
            if (cleanDescription.length < 10) {
                console.log(`⚠️ Пропускаємо: опис занадто короткий`);
                continue;
            }

            clauseCount++;
            
            clauses.push({
                type: clauseType,
                article: articleNumber,
                description: cleanDescription,
                fullText: `${clauseType} Artº.${articleNumber} – ${cleanDescription}`
            });

            console.log(`✅ Клауза #${clauseCount}: ${clauseType} Artº.${articleNumber}`);
            console.log(`   Опис: ${cleanDescription.substring(0, 60)}...`);
        }

        // ДОДАТКОВИЙ МЕТОД: Якщо перший не спрацював, шукаємо в табличному форматі
        // Іноді клаузи можуть бути в табличному форматі "Tipo | Deficiência detectada"
        if (clauses.length === 0) {
            console.log('🔄 Пробуємо альтернативний метод витягування (таблиця)...');
            
            // Шукаємо рядки що починаються з "Tipo" та містять "Deficiência detectada"
            // за якими слідує C1/C2/C3 з артикулом
            const tablePattern = /Tipo\s+(Defici[êe]ncia\s+detectada|Deficiency\s+detected)\s+C([123])\s+Art[ºo.]+\s*(\d+(?:[.,º\s]+\d+)*)\s*[–\-—]\s*(.+?)(?=\n|Tipo\s+|$)/gis;
            
            let tableMatch;
            while ((tableMatch = tablePattern.exec(clauseSection)) !== null) {
                const clauseType = `C${tableMatch[2]}`;
                const articleNumber = tableMatch[3].trim();
                const description = tableMatch[4].trim().replace(/\s+/g, ' ');
                
                if (description.length < 10) continue;

                clauseCount++;
                
                clauses.push({
                    type: clauseType,
                    article: articleNumber,
                    description: description,
                    fullText: `${clauseType} Artº.${articleNumber} – ${description}`
                });

                console.log(`✅ Клауза (таблиця) #${clauseCount}: ${clauseType} Artº.${articleNumber}`);
            }
        }

        console.log(`📊 Загальна кількість знайдених клауз: ${clauses.length}`);
        
        // Групуємо за типом для статистики
        const stats = {
            C1: clauses.filter(c => c.type === 'C1').length,
            C2: clauses.filter(c => c.type === 'C2').length,
            C3: clauses.filter(c => c.type === 'C3').length
        };
        
        console.log('📈 Статистика клауз:', stats);

        return clauses;
    }

    /**
     * Витягує базову інформацію про ліфт зі звіту
     * @param {string} text - Текст звіту
     * @returns {Object} - Інформація про ліфт
     */
    extractLiftInfo(text) {
        console.log('🏢 Витягуємо інформацію про ліфт...');

        const info = {
            location: null,
            postalCode: null,
            locality: null,
            municipality: null,
            owner: null,
            manufacturer: null,
            maintenanceCompany: null,
            reportNumber: null,
            installationNumber: null,
            processNumber: null,
            inspectionDate: null
        };

        // Локація
        const locationMatch = text.match(/Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s+(.+?)(?=C[óo]digo\s+Postal|Relat[óo]rio)/i);
        if (locationMatch) {
            info.location = locationMatch[1].trim();
        }

        // Поштовий код
        const postalMatch = text.match(/C[óo]digo\s+Postal\s+(\d{4}[-\s]?\d{3})/i);
        if (postalMatch) {
            info.postalCode = postalMatch[1].trim();
        }

        // Локальність
        const localityMatch = text.match(/Localidade\s+(.+?)(?=Instala[çc][ãa]o|Concelho)/i);
        if (localityMatch) {
            info.locality = localityMatch[1].trim();
        }

        // Муніципалітет
        const municipalityMatch = text.match(/Concelho\s+(.+?)(?=Posi[çc][ãa]o|Propriet[áa]rio)/i);
        if (municipalityMatch) {
            info.municipality = municipalityMatch[1].trim();
        }

        // Власник
        const ownerMatch = text.match(/Propriet[áa]rio\s+(.+?)(?=Marca|Morada)/i);
        if (ownerMatch) {
            info.owner = ownerMatch[1].trim();
        }

        // Виробник
        const manufacturerMatch = text.match(/Marca\s+ou\s+Fabricante\s+(.+?)(?=Empresa\s+Instaladora|Morada)/i);
        if (manufacturerMatch) {
            info.manufacturer = manufacturerMatch[1].trim();
        }

        // Компанія обслуговування
        const maintenanceMatch = text.match(/Empresa\s+de\s+Manutenção\s+(.+?)(?=TIPO\s+DE\s+EDIF[ÍI]CIO|$)/i);
        if (maintenanceMatch) {
            info.maintenanceCompany = maintenanceMatch[1].trim();
        }

        // Номер звіту
        const reportMatch = text.match(/Relat[óo]rio\s+n[º.]+\s*([\w\-]+)/i);
        if (reportMatch) {
            info.reportNumber = reportMatch[1].trim();
        }

        // Номер установки
        const installationMatch = text.match(/Instala[çc][ãa]o\s+n[º.]+\s*([\w\-]+)/i);
        if (installationMatch) {
            info.installationNumber = installationMatch[1].trim();
        }

        // Номер процесу
        const processMatch = text.match(/Processo\s+n[º.]+\s*([\w\-\.\/]+)/i);
        if (processMatch) {
            info.processNumber = processMatch[1].trim();
        }

        // Дата інспекції
        const dateMatch = text.match(/Data\s+da\s+Inspec[çc][ãa]o\s+.*?(\d{4}\/\d{2}\/\d{2})/i);
        if (dateMatch) {
            info.inspectionDate = dateMatch[1];
        }

        console.log('✅ Інформація витягнута:', info);
        return info;
    }

    /**
     * Повний парсинг PDF звіту інспекції
     * @param {File} file - PDF файл
     * @returns {Promise<Object>} - Об'єкт з витягнутими даними
     */
    async parseInspectionReport(file) {
        console.log('🚀 Початок парсингу звіту інспекції:', file.name);

        try {
            // 1. Витягуємо текст з PDF
            const text = await this.extractTextFromPDF(file);

            // 2. Витягуємо клаузи
            const clauses = this.extractClausesFromText(text);

            // 3. Витягуємо інформацію про ліфт
            const liftInfo = this.extractLiftInfo(text);

            // 4. Визначаємо результат інспекції
            const result = this.determineInspectionResult(text, clauses);

            const parsedData = {
                fileName: file.name,
                fileSize: file.size,
                parsedAt: new Date().toISOString(),
                liftInfo: liftInfo,
                clauses: clauses,
                clauseStats: {
                    total: clauses.length,
                    C1: clauses.filter(c => c.type === 'C1').length,
                    C2: clauses.filter(c => c.type === 'C2').length,
                    C3: clauses.filter(c => c.type === 'C3').length
                },
                inspectionResult: result,
                rawText: text.substring(0, 1000) // Перші 1000 символів для debug
            };

            console.log('✅ Парсинг завершено успішно');
            console.log('📊 Результат:', parsedData);

            return parsedData;

        } catch (error) {
            console.error('❌ Помилка парсингу звіту:', error);
            throw error;
        }
    }

    /**
     * Визначає результат інспекції на основі тексту та клауз
     * @param {string} text - Текст звіту
     * @param {Array} clauses - Масив клауз
     * @returns {Object} - Результат інспекції
     */
    determineInspectionResult(text, clauses) {
        const hasC1 = clauses.some(c => c.type === 'C1');
        const hasC2 = clauses.some(c => c.type === 'C2');
        const hasC2Star = text.match(/C2\*/i) !== null;
        
        // Шукаємо результат у тексті
        let status = 'unknown';
        let statusText = '';

        if (text.match(/Elevador\s+Reprovado\s+com\s+Imobiliza[çc][ãa]o/i)) {
            status = 'failed_immobilized';
            statusText = 'Reprovado com Imobilização';
        } else if (text.match(/Elevador\s+Reprovado.*C2/i) || (hasC2 && !hasC2Star)) {
            status = 'failed_c2';
            statusText = 'Reprovado C2 - Regularizar no prazo de 30 dias';
        } else if (text.match(/Elevador\s+Aprovado\s+com\s+cl[áa]usulas\s+C2\*/i) || hasC2Star) {
            status = 'approved_c2_star';
            statusText = 'Aprovado com cláusulas C2*';
        } else if (text.match(/Elevador\s+Aprovado\s+com\s+cl[áa]usulas\s+C3/i)) {
            status = 'approved_c3';
            statusText = 'Aprovado com cláusulas C3';
        } else if (text.match(/Elevador\s+Aprovado/i) && clauses.length === 0) {
            status = 'approved';
            statusText = 'Aprovado';
        } else if (clauses.length > 0) {
            // Визначаємо на основі найсерйознішої клаузи
            if (hasC1) {
                status = 'failed_immobilized';
                statusText = 'Reprovado com Imobilização (C1)';
            } else if (hasC2 && !hasC2Star) {
                status = 'failed_c2';
                statusText = 'Reprovado C2';
            } else if (hasC2Star) {
                status = 'approved_c2_star';
                statusText = 'Aprovado com C2*';
            } else {
                status = 'approved_c3';
                statusText = 'Aprovado com C3';
            }
        }

        return {
            status: status,
            statusText: statusText,
            hasImmobilization: hasC1,
            requiresReinspection: hasC2 && !hasC2Star,
            reinspectionDeadline: hasC2 && !hasC2Star ? '30 dias' : null
        };
    }

    /**
     * Форматує клаузи для відображення в UI
     * @param {Array} clauses - Масив клауз
     * @returns {string} - HTML для відображення
     */
    formatClausesForDisplay(clauses) {
        if (!clauses || clauses.length === 0) {
            return '<p class="text-muted">Без зауважень</p>';
        }

        let html = '<div class="clauses-list">';

        clauses.forEach((clause, index) => {
            const badgeClass = clause.type === 'C1' ? 'danger' : clause.type === 'C2' ? 'warning' : 'info';
            
            html += `
                <div class="clause-item mb-3 p-3 border-left border-${badgeClass}">
                    <div class="d-flex align-items-start">
                        <span class="badge badge-${badgeClass} mr-2">${clause.type}</span>
                        <div class="flex-grow-1">
                            <strong>Artº. ${clause.article}</strong>
                            <p class="mb-0 mt-1">${clause.description}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }
}

// Глобальна ініціалізація
window.inspectionReportParser = new InspectionReportParser();

// Автоматична ініціалізація при завантаженні
$(document).ready(function() {
    console.log('🎯 Inspection Report Parser готовий до використання');
});
