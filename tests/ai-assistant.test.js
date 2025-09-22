const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // URL сторінки для тестування
    const url = 'http://localhost/pages/client/dashboard.html';

    try {
        await page.goto(url);

        // Перевірка наявності кнопки AI-асистента
        const assistantButton = await page.$('.ai-assistant-button');
        if (assistantButton) {
            console.log('Кнопка AI-асистента знайдена.');
        } else {
            console.error('Кнопка AI-асистента не знайдена!');
        }

        // Клік по кнопці для відкриття модального вікна
        if (assistantButton) {
            await assistantButton.click();
            await page.waitForSelector('.ai-assistant-modal', { visible: true });
            console.log('Модальне вікно AI-асистента відкривається.');
        }

        // Перевірка завантаження CSS
        const cssLoaded = await page.evaluate(() => {
            const link = document.querySelector('link[href*="ai-assistant.css"]');
            return link && link.sheet && link.sheet.cssRules.length > 0;
        });
        if (cssLoaded) {
            console.log('CSS AI-асистента завантажено.');
        } else {
            console.error('CSS AI-асистента не завантажено!');
        }

        // Перевірка завантаження JS
        const jsLoaded = await page.evaluate(() => {
            return typeof window.aiAssistant !== 'undefined';
        });
        if (jsLoaded) {
            console.log('JS AI-асистента завантажено.');
        } else {
            console.error('JS AI-асистента не завантажено!');
        }

    } catch (error) {
        console.error('Помилка під час тестування:', error);
    } finally {
        await browser.close();
    }
})();