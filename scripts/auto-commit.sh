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
