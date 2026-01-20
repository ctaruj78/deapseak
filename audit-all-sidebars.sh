#!/bin/bash

echo "🔍 ПОВНИЙ АУДИТ SIDEBARS ВСІХ РОЛЕЙ"
echo "====================================="
echo ""

# Функція для підрахунку AI Асистента
check_ai_assistant() {
    local role=$1
    local dir="pages/$role"
    
    echo "📊 $role ($(echo $role | tr '[:lower:]' '[:upper:]')):"
    echo "-----------------------------------"
    
    # Підрахунок файлів
    total=$(find "$dir" -maxdepth 1 -name "*.html" -type f 2>/dev/null | wc -l)
    with_sidebar=$(grep -l "main-sidebar" "$dir"/*.html 2>/dev/null | wc -l)
    with_ai=$(grep -l "AI Асистент" "$dir"/*.html 2>/dev/null | wc -l)
    
    echo "  Всього сторінок: $total"
    echo "  З sidebar: $with_sidebar"
    echo "  З AI Асистентом: $with_ai"
    
    if [ $total -gt 0 ]; then
        percent=$((with_ai * 100 / total))
        echo "  Покриття AI: $percent%"
        
        if [ $percent -lt 80 ]; then
            echo "  ⚠️ УВАГА: Низьке покриття!"
        elif [ $percent -lt 100 ]; then
            echo "  ⚠️ Не всі файли мають AI Асистента"
        else
            echo "  ✅ Всі файли мають AI Асистента"
        fi
    fi
    
    # Список файлів БЕЗ AI Асистента
    echo ""
    echo "  Файли БЕЗ AI Асистента:"
    for file in "$dir"/*.html; do
        if [ -f "$file" ]; then
            if ! grep -q "AI Асистент" "$file" 2>/dev/null; then
                echo "    ❌ $(basename $file)"
            fi
        fi
    done
    
    echo ""
}

# Перевірка всіх ролей
check_ai_assistant "admin"
check_ai_assistant "dispatcher"
check_ai_assistant "tech"
check_ai_assistant "client"

echo "====================================="
echo "🎯 ПІДСУМОК"
echo "====================================="

# Загальна статистика
total_all=0
with_ai_all=0

for role in admin dispatcher tech client; do
    dir="pages/$role"
    total=$(find "$dir" -maxdepth 1 -name "*.html" -type f 2>/dev/null | wc -l)
    with_ai=$(grep -l "AI Асистент" "$dir"/*.html 2>/dev/null | wc -l)
    
    total_all=$((total_all + total))
    with_ai_all=$((with_ai_all + with_ai))
done

percent_all=$((with_ai_all * 100 / total_all))

echo "Всього HTML сторінок: $total_all"
echo "З AI Асистентом: $with_ai_all"
echo "Покриття: $percent_all%"
echo ""

if [ $percent_all -eq 100 ]; then
    echo "✅ PERFECT! Всі сторінки мають AI Асистента!"
elif [ $percent_all -ge 90 ]; then
    echo "✅ ВІДМІННО! Більшість сторінок мають AI Асистента"
elif [ $percent_all -ge 70 ]; then
    echo "⚠️ ДОБРЕ, але є що покращити"
else
    echo "❌ КРИТИЧНО! Багато сторінок без AI Асистента"
fi
