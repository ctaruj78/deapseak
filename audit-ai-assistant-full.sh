#!/bin/bash

echo "🔍 ПОВНИЙ АУДИТ AI ASSISTANT В СИСТЕМІ"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣ СТРУКТУРА ФАЙЛІВ AI ASSISTANT:"
echo "─────────────────────────────────────────────────────────"
find pages -name "*ai-assistant*.html" -type f | grep -v backup | sort
echo ""

echo "2️⃣ ПЕРЕВІРКА SIDEBAR ПОСИЛАНЬ (всі ролі):"
echo "─────────────────────────────────────────────────────────"
echo ""
echo "📁 ADMIN Sidebar:"
grep -A 3 "AI Assistant" pages/admin/includes/sidebar.html 2>/dev/null | grep "href=" || echo "  ❌ Не знайдено"
echo ""

echo "📁 DISPATCHER Sidebar:"
grep -A 3 "AI Assistant" pages/dispatcher/includes/sidebar.html 2>/dev/null | grep "href=" || echo "  ❌ Не знайдено"
echo ""

echo "📁 TECH Sidebar:"
if [ -f pages/tech/includes/sidebar.html ]; then
    grep -A 3 "AI" pages/tech/includes/sidebar.html | grep "href=" || echo "  ❌ AI Assistant відсутній"
else
    echo "  ⚠️  Sidebar файл не існує"
fi
echo ""

echo "📁 CLIENT (inline в кожній сторінці):"
grep -l "ai-assistant" pages/client/*.html | wc -l | xargs echo "  Файлів з AI згадками:"
echo ""

echo "3️⃣ ПЕРЕВІРКА INLINE WIDGETS (мають бути ВИДАЛЕНІ):"
echo "─────────────────────────────────────────────────────────"
echo ""
echo "📄 Client pages з inline widget:"
grep -l "ai-assistant-fab" pages/client/*.html 2>/dev/null | while read file; do
    echo "  ❌ $file"
done
echo ""

echo "📄 Dispatcher pages з inline widget:"
grep -l "ai-assistant-fab" pages/dispatcher/*.html 2>/dev/null | while read file; do
    echo "  ❌ $file"
done
echo ""

echo "📄 Admin pages з inline widget:"
grep -l "ai-assistant-fab" pages/admin/*.html 2>/dev/null | while read file; do
    echo "  ❌ $file"
done
echo ""

echo "📄 Tech pages з inline widget:"
grep -l "ai-assistant-fab" pages/tech/*.html 2>/dev/null | while read file; do
    echo "  ❌ $file"
done
echo ""

echo "4️⃣ ПІДСУМОК ПРАВИЛЬНОЇ СТРУКТУРИ:"
echo "─────────────────────────────────────────────────────────"
echo "✅ ПРАВИЛЬНО: Sidebar посилання → /pages/ai-assistant/ai-assistant.html"
echo "❌ НЕПРАВИЛЬНО: Inline widget (ai-assistant-fab) на сторінках"
echo ""
echo "5️⃣ РЕКОМЕНДАЦІЇ:"
echo "─────────────────────────────────────────────────────────"
echo "1. Видалити всі inline widgets з client pages"
echo "2. Додати AI Assistant в tech sidebar"
echo "3. Всі sidebar посилання мають вести на /pages/ai-assistant/ai-assistant.html"
echo ""
echo "════════════════════════════════════════════════════════════"
