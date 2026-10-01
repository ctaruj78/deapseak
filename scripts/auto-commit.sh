#!/bin/bash
cd /home/andriy/deapseak

# Перевіряємо чи є незбережені зміни
if ! git diff --quiet HEAD -- ':(exclude)node_modules'; then
    DATE=$(date '+%Y-%m-%d %H:%M')
    git add -A -- ':(exclude)node_modules'
    git commit -m "auto-backup: $DATE"
    echo "[$DATE] Auto-commit done"
else
    echo "[$(date '+%Y-%m-%d %H:%M')] No changes to commit"
fi

# Пушимо на GitHub (credentials збережені в ~/.git-credentials)
# Поточна гілка, а не захардкоджена v2_refactor — інакше пушиться застаріла
# гілка, поки реальна робота йде в іншій.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$CURRENT_BRANCH" >> /home/andriy/deapseak/logs/auto-commit.log 2>&1 && \
    echo "[$(date '+%Y-%m-%d %H:%M')] Auto-push done ($CURRENT_BRANCH)" || \
    echo "[$(date '+%Y-%m-%d %H:%M')] Auto-push failed ($CURRENT_BRANCH)"
