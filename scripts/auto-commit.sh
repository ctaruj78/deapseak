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
git push origin v2_refactor >> /home/andriy/deapseak/logs/auto-commit.log 2>&1 && \
    echo "[$(date '+%Y-%m-%d %H:%M')] Auto-push done" || \
    echo "[$(date '+%Y-%m-%d %H:%M')] Auto-push failed"
