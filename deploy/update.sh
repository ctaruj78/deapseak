#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# update.sh — Оновлення FestLift на міні ПК
# Запускати після кожного git push (зазвичай через ssh)
#
# Використання на міні ПК:
#   sudo bash /opt/festlift/deploy/update.sh
#
# Або з локальної машини через ssh:
#   ssh user@minipc "sudo bash /opt/festlift/deploy/update.sh"
# ═══════════════════════════════════════════════════════════════════

set -e

echo "🔄 Оновлення FestLift..."

cd /opt/festlift

# Забираємо зміни з GitHub
git pull origin v2_refactor

# Встановлюємо нові залежності (якщо з'явилися)
npm install --production

# Права
chown -R festlift:festlift /opt/festlift

# Перезапускаємо сервер
systemctl restart festlift

echo "✅ FestLift оновлено і перезапущено!"
systemctl status festlift --no-pager | head -8
