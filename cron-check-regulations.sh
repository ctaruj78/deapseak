#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 🔄 AUTO-UPDATE REGULATIONS - Cron Job Script
# ═══════════════════════════════════════════════════════════
# Запускається щодня о 03:00 для перевірки нових законів

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$SCRIPT_DIR/logs/regulations-cron.log"

echo "═══════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "🕐 $(date '+%Y-%m-%d %H:%M:%S') - Початок автоматичної перевірки" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════" >> "$LOG_FILE"

# Перейти в директорію проекту
cd "$SCRIPT_DIR"

# Запустити Node.js скрипт
node services/regulations-updater.js >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Перевірка завершена успішно" >> "$LOG_FILE"
else
    echo "❌ Помилка при перевірці (exit code: $EXIT_CODE)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"

exit $EXIT_CODE
