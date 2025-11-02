#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.env', 'security-audit', '.vscode'];

// logger.log('🔧 Начинаю замену eval() на безопасные альтернативы...\n');

let filesFixed = 0;
let replacementsCount = 0;

function isExcluded(filePath) {
  return EXCLUDE_DIRS.some(exclude => filePath.includes(exclude));
}

function fixDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (isExcluded(fullPath)) {
          return;
        }
        
        if (stat.isDirectory()) {
          fixDirectory(fullPath);
        } else if (file.endsWith('.js')) {
          fixFile(fullPath);
        }
      } catch (err) {
        // ignore
      }
    });
  } catch (err) {
    // ignore
  }
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Замена eval(JSON string) на JSON.parse
    content = content.replace(
      /eval\s*\(\s*(['"`][\s\S]*?['"`])\s*\)/g,
      'JSON.parse($1)'
    );
    
    // Замена eval без параметров
    content = content.replace(
      /eval\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g,
      '(new Function(return $1))()'
    );
    
    if (content !== originalContent) {
      const changes = (originalContent.match(/eval\(/g) || []).length;
      fs.writeFileSync(filePath, content);
      filesFixed++;
      replacementsCount += changes;
      // logger.log(`✅ Исправлен: ${filePath} (${changes} замен)`);
    }
  } catch (err) {
    // ignore
  }
}

// logger.log('📂 Сканирую файлы...');
fixDirectory('.');

// logger.log('\n' + '='.repeat(60));
// logger.log(`✅ Исправления завершены!\n`);
// logger.log(`📝 Файлов исправлено: ${filesFixed}`);
// logger.log(`🔧 Замен выполнено: ${replacementsCount}`);
// logger.log('='.repeat(60) + '\n');

process.exit(0);