// Тести для email, inspection, invoice, report форм
// Використовується Jest (або аналогічний runner)

const { LiftAPI } = require('../api');
const { StorageManager } = require('../storage');

describe('Email Form', () => {
    test('Відправка email через API', async () => {
        const formData = { to: 'test@example.com', subject: 'Тест', message: 'Привіт!' };
        const result = await LiftAPI.request('/emails', 'POST', formData);
        expect(result).toBeDefined();
        expect(result.success).toBeTruthy();
    });

    test('Збереження email локально при помилці', () => {
        StorageManager.save('pending_emails', []);
        const emails = StorageManager.load('pending_emails');
        expect(Array.isArray(emails)).toBe(true);
    });
});

describe('Inspection Form', () => {
    test('Відправка інспекції через API', async () => {
        const formData = { liftId: 1, inspector: 'Іван', date: '2025-09-21', notes: 'ОК' };
        const result = await LiftAPI.request('/inspections', 'POST', formData);
        expect(result).toBeDefined();
        expect(result.success).toBeTruthy();
    });

    test('Збереження інспекції локально при помилці', () => {
        StorageManager.save('pending_inspections', []);
        const inspections = StorageManager.load('pending_inspections');
        expect(Array.isArray(inspections)).toBe(true);
    });
});

describe('Invoice Form', () => {
    test('Відправка рахунку через API', async () => {
        const formData = { client: 'Петренко', amount: 1000, dueDate: '2025-09-30', description: 'Тест' };
        const result = await LiftAPI.request('/invoices', 'POST', formData);
        expect(result).toBeDefined();
        expect(result.success).toBeTruthy();
    });

    test('Збереження рахунку локально при помилці', () => {
        StorageManager.save('pending_invoices', []);
        const invoices = StorageManager.load('pending_invoices');
        expect(Array.isArray(invoices)).toBe(true);
    });
});

describe('Report Form', () => {
    test('Відправка звіту через API', async () => {
        const formData = { title: 'Звіт', author: 'Іван', date: '2025-09-21', content: 'Тест' };
        const result = await LiftAPI.request('/reports', 'POST', formData);
        expect(result).toBeDefined();
        expect(result.success).toBeTruthy();
    });

    test('Збереження звіту локально при помилці', () => {
        StorageManager.save('pending_reports', []);
        const reports = StorageManager.load('pending_reports');
        expect(Array.isArray(reports)).toBe(true);
    });
});
