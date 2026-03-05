// ============================================
// FORM VALIDATOR - Покращена валідація форм
// ============================================

class FormValidator {
    constructor(formSelector) {
        this.form = $(formSelector);
        this.errors = [];
        this.init();
    }

    init() {
        console.log('📝 FormValidator initialized for:', this.form.attr('id'));
        
        // Видаляємо помилки при вводі
        this.form.find('input, textarea, select').on('input change', function() {
            $(this).removeClass('is-invalid').addClass('is-valid');
            $(this).siblings('.invalid-feedback').remove();
        });
    }

    // Валідація обов'язкового поля
    required(selector, fieldName) {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            this.addError(field, `${fieldName} є обов'язковим полем`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    // Валідація email
    email(selector, fieldName = 'Email') {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            return true; // Якщо пусте - нехай required перевіряє
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            this.addError(field, `${fieldName} має невірний формат`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    // Валідація телефону (міжнародний формат)
    phone(selector, fieldName = 'Телефон') {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            return true; // Якщо пусте - нехай required перевіряє
        }
        
        // Міжнародний формат: +XXXXXXXXXXX або локальний (7-15 цифр після очищення)
        const cleanValue = value.replace(/[\s\-\(\)\.]/g, '');
        const phoneRegex = /^\+?\d{7,15}$/;
        
        if (!phoneRegex.test(cleanValue)) {
            this.addError(field, `${fieldName} має невірний формат. Приклад: +351912345678`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    // Валідація довжини
    minLength(selector, min, fieldName) {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            return true; // Якщо пусте - нехай required перевіряє
        }
        
        if (value.trim().length < min) {
            this.addError(field, `${fieldName} має містити мінімум ${min} символів`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    maxLength(selector, max, fieldName) {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            return true;
        }
        
        if (value.trim().length > max) {
            this.addError(field, `${fieldName} не може перевищувати ${max} символів`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    // Валідація числа
    number(selector, fieldName, options = {}) {
        const field = this.form.find(selector);
        const value = field.val();
        
        if (!value || value.trim() === '') {
            return true;
        }
        
        const num = parseFloat(value);
        
        if (isNaN(num)) {
            this.addError(field, `${fieldName} має бути числом`);
            return false;
        }
        
        if (options.min !== undefined && num < options.min) {
            this.addError(field, `${fieldName} не може бути менше ${options.min}`);
            return false;
        }
        
        if (options.max !== undefined && num > options.max) {
            this.addError(field, `${fieldName} не може бути більше ${options.max}`);
            return false;
        }
        
        field.removeClass('is-invalid').addClass('is-valid');
        return true;
    }

    // Валідація координат
    coordinates(latSelector, lngSelector) {
        const latField = this.form.find(latSelector);
        const lngField = this.form.find(lngSelector);
        
        const lat = parseFloat(latField.val());
        const lng = parseFloat(lngField.val());
        
        let valid = true;
        
        if (latField.val() && (isNaN(lat) || lat < -90 || lat > 90)) {
            this.addError(latField, 'Широта має бути від -90 до 90');
            valid = false;
        }
        
        if (lngField.val() && (isNaN(lng) || lng < -180 || lng > 180)) {
            this.addError(lngField, 'Довгота має бути від -180 до 180');
            valid = false;
        }
        
        if (valid) {
            latField.removeClass('is-invalid').addClass('is-valid');
            lngField.removeClass('is-invalid').addClass('is-valid');
        }
        
        return valid;
    }

    // Додавання помилки до поля
    addError(field, message) {
        field.removeClass('is-valid').addClass('is-invalid');
        
        // Видаляємо стару помилку
        field.siblings('.invalid-feedback').remove();
        
        // Додаємо нову
        field.after(`<div class="invalid-feedback d-block">${message}</div>`);
        
        this.errors.push({ field: field.attr('id'), message });
        
        // Скролимо до першої помилки (тільки якщо елемент видимий — offset() === undefined в прихованих вкладках)
        if (this.errors.length === 1) {
            const fieldOffset = field.offset();
            if (fieldOffset) {
                $('html, body').animate({
                    scrollTop: fieldOffset.top - 100
                }, 300);
            }
        }
    }

    // Очищення всіх помилок
    clearErrors() {
        this.errors = [];
        this.form.find('.is-invalid').removeClass('is-invalid');
        this.form.find('.is-valid').removeClass('is-valid');
        this.form.find('.invalid-feedback').remove();
    }

    // Перевірка чи форма валідна
    isValid() {
        return this.errors.length === 0;
    }

    // Отримання всіх помилок
    getErrors() {
        return this.errors;
    }

    // Показати всі помилки у вигляді повідомлення
    showErrorsSummary() {
        if (this.errors.length === 0) return;
        
        let message = '<strong>Виправте наступні помилки:</strong><ul class="mb-0 mt-2">';
        this.errors.forEach(error => {
            message += `<li>${error.message}</li>`;
        });
        message += '</ul>';
        
        // Використовуємо toastr якщо доступний
        if (typeof toastr !== 'undefined') {
            toastr.error(message, 'Помилка валідації', {
                timeOut: 8000,
                closeButton: true,
                progressBar: true,
                enableHtml: true
            });
        } else {
            alert(this.errors.map(e => e.message).join('\n'));
        }
    }
}

// Експорт для використання
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidator;
}

console.log('✅ FormValidator loaded');
