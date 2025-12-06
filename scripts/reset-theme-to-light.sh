#!/bin/bash
# 🌞 Скидання теми на світлу для всіх користувачів

echo "🌞 СКИДАННЯ ТЕМИ НА СВІТЛУ"
echo "============================"
echo ""
echo "Це скрипт для інформації. Виконується в браузері кожного користувача."
echo ""
echo "📋 Інструкція для користувачів:"
echo ""
echo "1️⃣ Відкрити будь-яку сторінку проекту"
echo "2️⃣ Натиснути F12 (Developer Tools)"
echo "3️⃣ Перейти на вкладку Console"
echo "4️⃣ Виконати команду:"
echo ""
echo "// Скидання теми на світлу"
cat << 'EOF'
(function() {
    // Отримуємо поточні налаштування
    const settings = localStorage.getItem('user_settings');
    
    if (settings && settings !== 'undefined' && settings !== 'null') {
        try {
            const parsed = JSON.parse(settings);
            
            // Якщо тема темна - змінюємо на світлу
            if (parsed.theme === 'dark') {
                console.log('🌙 Поточна тема: ТЕМНА');
                parsed.theme = 'light';
                localStorage.setItem('user_settings', JSON.stringify(parsed));
                console.log('🌞 Тема змінена на: СВІТЛА');
                console.log('🔄 Перезавантажте сторінку...');
                setTimeout(() => location.reload(), 1000);
            } else {
                console.log('✅ Тема вже СВІТЛА');
            }
        } catch (e) {
            console.error('❌ Помилка:', e);
        }
    } else {
        console.log('📦 Налаштувань немає - буде світла тема за замовчуванням');
    }
})();
EOF

echo ""
echo ""
echo "5️⃣ Натиснути Enter"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "📝 АБО використати автоматичний reset:"
echo ""
echo "localStorage.removeItem('user_settings')"
echo "location.reload()"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "✅ РЕЗУЛЬТАТ:"
echo "   • Тема скинута на СВІТЛУ"
echo "   • Сторінка перезавантажена"
echo "   • Зміни збережені"
echo ""
