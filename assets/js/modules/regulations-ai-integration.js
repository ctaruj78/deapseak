// regulations-ai-integration.js
// Інтеграція з API нормативних документів для клієнтської панелі

class RegulationsAI {
    constructor() {
        this._getToken = () => {
            return localStorage.getItem('authToken') ||
                   localStorage.getItem('token') ||
                   (localStorage.getItem('userData') && JSON.parse(localStorage.getItem('userData')).token) ||
                   '';
        };
    }

    _headers() {
        const token = this._getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    /**
     * Отримати конкретний нормативний документ за кодом/ID
     * @param {string} code - ID або код документа
     * @returns {Promise<{success: boolean, data?: Object}>}
     */
    async getRegulation(code) {
        try {
            // Спочатку пробуємо /api/ai/regulations/:id
            const res = await fetch(`/api/ai/regulations/${encodeURIComponent(code)}`, {
                headers: this._headers()
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    return { success: true, data: data.data };
                }
            }

            // Fallback: пошук у /api/regulations?search=code
            const fallbackRes = await fetch(`/api/regulations?search=${encodeURIComponent(code)}`, {
                headers: this._headers()
            });

            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                const regulations = Array.isArray(fallbackData.data) ? fallbackData.data : [];
                const found = regulations.find(r =>
                    r.id === code || r.code === code || r.number === code
                ) || regulations[0];

                if (found) {
                    return { success: true, data: found };
                }
            }

            return { success: false, error: 'Documento não encontrado' };
        } catch (err) {
            console.error('[RegulationsAI] getRegulation error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Задати запитання AI — пошук релевантних документів за ключовим словом
     * @param {string} question - Запитання або ключові слова
     * @returns {Promise<{success: boolean, regulations?: Array, answer?: string}>}
     */
    async askAI(question) {
        try {
            // Пробуємо AI-пошук
            const res = await fetch(`/api/ai/regulations/search?q=${encodeURIComponent(question)}`, {
                headers: this._headers()
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const regulations = data.data && Array.isArray(data.data.results)
                        ? data.data.results
                        : (Array.isArray(data.data) ? data.data : []);

                    const answer = regulations.length > 0
                        ? `Знайдено ${regulations.length} документ(ів) за запитом "${question}". Виберіть потрібний для перегляду деталей.`
                        : `За запитом "${question}" документів не знайдено. Спробуйте інші ключові слова.`;

                    return { success: true, regulations, answer };
                }
            }

            // Fallback: загальний пошук
            const fallbackRes = await fetch(`/api/regulations?search=${encodeURIComponent(question)}`, {
                headers: this._headers()
            });

            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                const regulations = Array.isArray(fallbackData.data) ? fallbackData.data : [];

                const answer = regulations.length > 0
                    ? `Знайдено ${regulations.length} документ(ів) за запитом "${question}".`
                    : `За запитом "${question}" документів не знайдено.`;

                return { success: true, regulations, answer };
            }

            return { success: false, error: 'Помилка з\'єднання з сервером' };
        } catch (err) {
            console.error('[RegulationsAI] askAI error:', err);
            return { success: false, error: err.message };
        }
    }
}
