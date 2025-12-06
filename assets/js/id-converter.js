/**
 * UNIVERSAL ID CONVERTER
 * Виправляє проблему з MongoDB ObjectId в HTML атрибутах
 * 
 * Проблема: MongoDB повертає _id як ObjectId, який не можна використовувати в onclick="func('${obj._id}')"
 * Рішення: Завжди конвертувати в string перед використанням
 */

// Глобальна функція для безпечного витягування ID
window.safeId = function(obj) {
    if (!obj) return '';
    
    // Якщо _id є ObjectId з методом toString
    if (obj._id && typeof obj._id.toString === 'function') {
        return obj._id.toString();
    }
    
    // Якщо _id є строкою
    if (obj._id && typeof obj._id === 'string') {
        return obj._id;
    }
    
    // Якщо є поле id
    if (obj.id && typeof obj.id === 'string') {
        return obj.id;
    }
    
    // Якщо id є ObjectId
    if (obj.id && typeof obj.id.toString === 'function') {
        return obj.id.toString();
    }
    
    console.warn('⚠️ Об\'єкт без валідного ID:', obj);
    return '';
};

// Функція для масового конвертування масиву об'єктів
window.ensureStringIds = function(items) {
    if (!Array.isArray(items)) return items;
    
    return items.map(item => {
        if (!item) return item;
        
        // Конвертуємо _id в string якщо це ObjectId
        if (item._id) {
            item._id = window.safeId(item);
        }
        
        // Конвертуємо id в string якщо це ObjectId
        if (item.id && typeof item.id !== 'string') {
            item.id = item.id.toString();
        }
        
        return item;
    });
};

// Функція для конвертування одного об'єкта
window.ensureStringId = function(item) {
    if (!item) return item;
    
    // Конвертуємо _id в string якщо це ObjectId
    if (item._id && typeof item._id !== 'string') {
        if (typeof item._id.toString === 'function') {
            item._id = item._id.toString();
        }
    }
    
    // Конвертуємо id в string якщо це ObjectId
    if (item.id && typeof item.id !== 'string') {
        if (typeof item.id.toString === 'function') {
            item.id = item.id.toString();
        }
    }
    
    return item;
};

console.log('✅ ID Converter завантажено');
