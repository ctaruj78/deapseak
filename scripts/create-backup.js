#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* logger.log( */'💾 Створюю backup проекту...\n');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
const backupDir = path.join(__dirname, '..', 'backups');
const backupName = `deapseak-backup-${timestamp}`;
const backupPath = path.join(backupDir, backupName);

// Створюємо папку для backup
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

try {
  /* logger.log( */`📂 Створюю архів: ${backupName}.tar.gz`);
  
  // Створюємо tar.gz архів (виключаємо node_modules, .git, backups)
  execSync(
    `tar -czf "${backupPath}.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='security-audit' \
    --exclude='.env' \
    -C .. deapseak`,
    { stdio: 'inherit' }
  );
  
  /* logger.log( */`\n✅ Backup успішно створено: ${backupPath}.tar.gz`);
  /* logger.log( */`📊 Розмір: ${(fs.statSync(backupPath + '.tar.gz').size / 1024 / 1024).toFixed(2)} MB`);
  
} catch (err) {
  /* logger.error( */`❌ Помилка створення backup: ${err.message}`);
  process.exit(1);
}

process.exit(0);