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
        // Формат Bureau Veritas: "C2 Artº.46.º 2 – O dispositivo contra entalamentos..."
        // Формат IEP: "C2 | DL. 513/70 (Artº 64º-1) - Não existe..."
        // ВАЖЛИВО: Артикул ПОВИНЕН бути числом, а не словом типо "NOTA"
        
        // Regex для Bureau Veritas формату
        const clausePatternBV = /\b(C[123])\s+(?:Art[ºo.]+\s*)?(\d+(?:[.,º\s]+\d+)*)\s*[–\-—]\s*(.+?)(?=\n\s*C[123]\s|$)/gis;
        
        // Regex для IEP формату: "C2 | DL. 513/70 (Artº 64º-1) - ..."
        // ПОКРАЩЕНИЙ: [\s\S]+? для захоплення багаторядкових описів
        const clausePatternIEP = /(C[123])\s*\|[^(]*\(\s*Artº?\s*([\d]+[\dº.,\s-]*)\s*\)\s*[-–—]\s*([\s\S]+?)(?=\s*C[123]\s*\||Notas:|RESULTADO|$)/gi;

        let match;
        let clauseCount = 0;

        // Спочатку пробуємо Bureau Veritas формат
        while ((match = clausePatternBV.exec(clauseSection)) !== null) {
            const clauseType = match[1].toUpperCase(); // C1, C2, або C3
            const articleNumber = match[2].trim();
            let description = match[3].trim();

            // ФІЛЬТРУЄМО неправильні співпадіння:
            
            // 1. Перевіряємо чи артикул - це число (не "NOTA" чи інше слово)
            if (!/^\d+/.test(articleNumber)) {
                console.log(`⚠️ Пропускаємо: артикул "${articleNumber}" не є числом`);
                continue;
            }
            
            // 1a. КРИТИЧНО: Виключаємо артикул "NOTA" явно
            if (articleNumber.toUpperCase().includes('NOTA')) {
                console.log(`⚠️ Пропускаємо: артикул містить "NOTA" - це не порушення`);
                continue;
            }
            
            // 2. Перевіряємо чи опис не містить метатекст про типи клауз
            const metaTextPatterns = [
                /foram\s+detetadas?\s+cl[áa]usulas?\s+tipo/i,
                /correspondem\s+a\s+situa[çc][õo]es/i,
                /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
                /d[ãa]o\s+lugar\s+a\s+uma\s+reinspec[çc][ãa]o/i,
                /cumprir\s+no\s+prazo\s+m[áa]ximo/i,
                /de\s+acordo\s+com\s+o\s+Decreto/i,
                /Instala[çc][õo]es\s+de\s+eleva[çc][ãa]o/i
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
            let cleanDescription = description
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();
            
            // 4. КРИТИЧНО: Перевіряємо чи опис не починається з цифри та тире
            // Це означає що підрозділ артикула потрапив в опис через перенос рядка
            // Приклад: "2 – O acesso à casa..." - це частина "Artº.22.º 2 – ..."
            if (/^\d+\s*[–\-—]\s*/.test(cleanDescription)) {
                console.log(`⚠️ Пропускаємо: опис починається з підрозділу "${cleanDescription.substring(0, 30)}..."`);
                console.log(`   Можливо це дублікат артикула ${articleNumber} з підрозділом`);
                continue;
            }
            
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

            console.log(`✅ Клауза BV #${clauseCount}: ${clauseType} Artº.${articleNumber}`);
            console.log(`   Опис: ${cleanDescription.substring(0, 60)}...`);
        }

        // ДОДАТКОВИЙ МЕТОД 1: Пробуємо IEP формат
        console.log('🔄 Пробуємо IEP формат витягування...');
        while ((match = clausePatternIEP.exec(clauseSection)) !== null) {
            const clauseType = match[1].toUpperCase();
            const articleNumber = match[2].trim();
            let description = match[3].trim();

            // Застосовуємо ті самі фільтри
            if (!/^\d+/.test(articleNumber)) {
                console.log(`⚠️ IEP: Пропускаємо: артикул "${articleNumber}" не є числом`);
                continue;
            }

            const metaTextPatterns = [
                /foram\s+detetadas?\s+cl[áa]usulas?\s+tipo/i,
                /correspondem\s+a\s+situa[çc][õo]es/i,
                /cumprir\s+no\s+prazo\s+m[áa]ximo/i,
                /de\s+acordo\s+com\s+o\s+Decreto/i
            ];

            if (metaTextPatterns.some(pattern => pattern.test(description))) {
                console.log(`⚠️ IEP: Пропускаємо метатекст`);
                continue;
            }

            let cleanDescription = description
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();

            // Додаткова очистка для IEP: видаляємо текст в дужках на початку
            cleanDescription = cleanDescription.replace(/^\([^)]*\)\s*/, '');

            if (/^\d+\s*[–\-—]\s*/.test(cleanDescription)) {
                console.log(`⚠️ IEP: Пропускаємо: опис починається з підрозділу`);
                continue;
            }

            if (cleanDescription.length < 10) {
                console.log(`⚠️ IEP: Пропускаємо: опис занадто короткий`);
                continue;
            }

            clauseCount++;

            clauses.push({
                type: clauseType,
                article: articleNumber,
                description: cleanDescription,
                fullText: `${clauseType} | DL (Artº.${articleNumber}) – ${cleanDescription}`
            });

            console.log(`✅ Клауза IEP #${clauseCount}: ${clauseType} Artº.${articleNumber}`);
            console.log(`   Опис: ${cleanDescription.substring(0, 60)}...`);
        }

        // ДОДАТКОВИЙ МЕТОД 2: Якщо обидва не спрацювали, шукаємо в табличному форматі
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
        
        // ДЕДУПЛІКАЦІЯ: Видаляємо дублікати клауз за комбінацією type + article
        // Іноді в PDF одна клауза може бути згадана двічі або з різною точністю (22 vs 22.2)
        const uniqueClauses = [];
        const seenKeys = new Map(); // Map для збереження повної інформації
        
        for (const clause of clauses) {
            // Нормалізуємо номер артикула: видаляємо зайві символи
            const normalizedArticle = clause.article.replace(/[°º\s-]/g, '');
            
            // Створюємо унікальний ключ: тип + нормалізований артикул
            const key = `${clause.type}|${normalizedArticle}`;
            
            // Перевіряємо чи немає точного дубліката
            if (seenKeys.has(key)) {
                console.log(`⚠️ Видалено точний дублікат: ${clause.type} Artº.${clause.article}`);
                continue;
            }
            
            // Перевіряємо чи немає часткового дубліката (22 vs 22.2)
            // Шукаємо чи є вже клауза з тим самим типом та схожим артикулом
            let isDuplicate = false;
            for (const [existingKey, existingClause] of seenKeys.entries()) {
                if (existingKey.startsWith(clause.type + '|')) {
                    const existingArticle = existingKey.split('|')[1];
                    
                    // Якщо один артикул є префіксом іншого - це дублікат
                    // Приклад: 22 є префіксом 22.2 або 22.3
                    // АБО якщо артикули точно однакові - це точний дублікат
                    if (normalizedArticle === existingArticle) {
                        console.log(`⚠️ Видалено точний дублікат по опису: ${clause.type} Artº.${clause.article}`);
                        isDuplicate = true;
                        break;
                    } else if (normalizedArticle.startsWith(existingArticle + '.') || 
                        existingArticle.startsWith(normalizedArticle + '.')) {
                        
                        // Залишаємо більш детальний (довший) артикул
                        if (normalizedArticle.length > existingArticle.length) {
                            // Новий артикул детальніший - видаляємо старий
                            console.log(`🔄 Заміна: ${existingClause.type} Artº.${existingClause.article} → ${clause.type} Artº.${clause.article}`);
                            seenKeys.delete(existingKey);
                            const index = uniqueClauses.findIndex(c => c === existingClause);
                            if (index !== -1) uniqueClauses.splice(index, 1);
                        } else {
                            // Старий артикул детальніший - пропускаємо новий
                            console.log(`⚠️ Видалено менш детальний дублікат: ${clause.type} Artº.${clause.article} (є ${existingClause.article})`);
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
        
        console.log(`🔧 Після дедуплікації: ${uniqueClauses.length} унікальних клауз (було ${clauses.length})`);
        
        // Групуємо за типом для статистики
        const stats = {
            C1: uniqueClauses.filter(c => c.type === 'C1').length,
            C2: uniqueClauses.filter(c => c.type === 'C2').length,
            C3: uniqueClauses.filter(c => c.type === 'C3').length
        };
        
        console.log('📈 Статистика клауз:', stats);

        return uniqueClauses;
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
            inspectionDate: null,
            nextInspectionDate: null,
            inspectionResult: null
        };

        // Локація (гнучкі патерни)
        let location = null;
        const locationPatterns = [
            /Local\s+da\s+instala[çc][ãa]o\s*:?\s*([^\n]{10,150})/i,
            /(?:LOCALIZAÇÃO|Local(?:ização)?|Morada|Endereço)\s*:?\s*([^\n]{10,150})/i,
            /((?:Rua|Avenida|Av\.|R\.|Praça|Pç\.|Travessa)\s+[A-ZÀ-Ú][^\n]{5,100})/i,
            /(\d{4}[-\s]?\d{3}\s+[A-ZÀ-Ú][a-zà-úa-z\s]+(?:,\s*Portugal)?)/,
            /(?:sito|localizado)\s+em\s+([^\n]{10,120})/i,
            /endere[çc]o\s*:?\s*([^\n]{10,120})/i,
            /instala[çc][ãa]o\s*:?\s*([^\n]{10,120})/i,
            /((?:Rua|Avenida)\s+[^,\n]+,?\s*n[ºo.]\s*\d+[^\n]{0,50})/i,
            /([A-ZÀ-Ú][a-zà-úa-z\s]+,\s*\d{4}[-\s]\d{3})/,
            /local\s*:?\s*([^\n]{10,120})/i,
            /(?:Edif[íi]cio|Pr[ée]dio)\s+([^\n]{10,120})/i
        ];
        for (let i = 0; i < locationPatterns.length; i++) {
            const match = text.match(locationPatterns[i]);
            if (match) {
                location = match[1].trim();
                location = location.replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]|ELEVADOR|Página).*$/i, '').replace(/^\s*(O|A|o|a)\s+/, '').trim();
                break;
            }
        }
        if (location) {
            info.location = location;
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
        if (!dateMatch) {
            // Alternate patterns
            const dateMatch2 = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
            if (dateMatch2) info.inspectionDate = dateMatch2[1];
        } else {
            info.inspectionDate = dateMatch[1];
        }

        // Próxima data de inspeção (explicit in report)
        const nextDatePatterns = [
            /[Pp]r[oó]xima\s+[Ii]nspec[çc][ãa]o\s*:?\s*(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
            /[Pp]r[oó]xima\s+[Ii]nspec[çc][ãa]o\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
            /[Vv][áa]lido?\s+at[eé]\s*:?\s*(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
            /[Vv][áa]lido?\s+at[eé]\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
            /[Pp]r[oó]xima\s+data\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
        ];
        for (const pattern of nextDatePatterns) {
            const m = text.match(pattern);
            if (m) { info.nextInspectionDate = m[1]; break; }
        }

        // Resultado da inspeção
        if (text.match(/[Aa]provado|[Aa]provação/)) info.inspectionResult = 'approved';
        else if (text.match(/[Rr]eprovado|[Rr]eprovação/)) info.inspectionResult = 'failed';

        // Calculate nextInspectionDate if not found explicitly
        if (!info.nextInspectionDate && info.inspectionDate) {
            try {
                let baseDate;
                const dateParts = info.inspectionDate.replace(/-/g, '/').split('/');
                if (dateParts[0].length === 4) {
                    baseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                } else {
                    baseDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                }
                if (!isNaN(baseDate.getTime())) {
                    const next = new Date(baseDate);
                    if (info.inspectionResult === 'failed') {
                        next.setDate(next.getDate() + 180); // 180 days for failed
                    } else {
                        next.setFullYear(next.getFullYear() + 2); // 2 years for approved/unknown
                    }
                    info.nextInspectionDate = next.toLocaleDateString('pt-PT');
                    info.nextInspectionDateCalculated = true; // flag that it was calculated, not extracted
                }
            } catch (e) { /* ignore date calc error */ }
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
