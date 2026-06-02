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
                        ? `Foram encontrados ${regulations.length} documento(s) legais para "${question}". Selecione um para ver artigos e pontos aplicáveis.`
                        : `Não encontrei documentos legais para "${question}". Tente termos jurídicos objetivos, por exemplo: "DL 320/2002 artigo 8", "inspeção periódica", "coima contrato EMA".`;

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
                    ? `Foram encontrados ${regulations.length} documento(s) legais para "${question}".`
                    : `Não foram encontrados documentos legais para "${question}".`;

                return { success: true, regulations, answer };
            }

            return { success: false, error: 'Erro de ligação ao servidor' };
        } catch (err) {
            console.error('[RegulationsAI] askAI error:', err);
            return { success: false, error: err.message };
        }
    }
}
