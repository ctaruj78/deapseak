const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CC = 10;

// Aceita `raw` como array (JSON) ou string separada por vírgulas/ponto-e-vírgula
// (o típico "cole vários emails aqui" de um campo CC de formulário).
function parseCcList(raw) {
    if (!raw) return { list: [], invalid: [] };

    const parts = Array.isArray(raw) ? raw : String(raw).split(/[,;]/);
    const seen = new Set();
    const list = [];
    const invalid = [];

    for (const part of parts) {
        const email = String(part || '').trim();
        if (!email) continue;
        if (!EMAIL_REGEX.test(email)) {
            invalid.push(email);
            continue;
        }
        const key = email.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            list.push(email);
        }
    }

    return { list: list.slice(0, MAX_CC), invalid };
}

module.exports = { parseCcList, MAX_CC };
