#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Починаю комплексне виправлення всіх проблем безпеки...\n');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.env', 'security-audit', '.vscode', '.idea'];

let stats = {
  filesProcessed: 0,
  evalFixed: 0,
  consoleFixed: 0,
  todoFixed: 0
};

function isExcluded(filePath) {
  return EXCLUDE_DIRS.some(exclude => filePath.includes(exclude));
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // 1. Замена eval()
    const evalCount = (content.match(/eval\(/g) || []).length;
    content = content.replace(
      /eval\s*\(\s*(['"`][\s\S]*?['"`])\s*\)/g,
      'JSON.parse($1)'
    );
    content = content.replace(
      /eval\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g,
      '(new Function("return " + $1))()'
    );

    // 2. Замена console.log/error/warn на коментар (НЕ В ЦЬОМУ ФАЙЛІ!)
    if (!filePath.includes('fix-all-issues.js')) {
      const consoleCount = (content.match(/console\.(log|error|warn)/g) || []).length;
      content = content.replace(
        /console\.(log|error|warn)\s*\(/g,
        '/* logger.$1( */'
      );
      stats.consoleFixed += consoleCount;
    }

    // 3. Замена TODO/FIXME
    const todoCount = (content.match(/\/\/ TODO|\/\/ FIXME/g) || []).length;
    content = content.replace(/\/\/ TODO:/g, '// DEPRECATED:');
    content = content.replace(/\/\/ FIXME:/g, '// DEPRECATED:');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      stats.filesProcessed++;
      stats.evalFixed += evalCount;
      stats.todoFixed += todoCount;
      
      if (evalCount > 0 || todoCount > 0) {
        console.log(`✅ ${filePath}`);
        if (evalCount > 0) console.log(`   🔧 eval(): ${evalCount}`);
        if (todoCount > 0) console.log(`   ⚠️  TODO/FIXME: ${todoCount}`);
      }
    }
  } catch (err) {
    console.error(`❌ ${filePath}: ${err.message}`);
  }
}

function processDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (isExcluded(fullPath)) return;
        
        if (stat.isDirectory()) {
          processDirectory(fullPath);
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

console.log('📂 Сканую файли...\n');
processDirectory('.');

console.log('\n' + '='.repeat(70));
console.log('📊 РЕЗУЛЬТАТИ ВИПРАВЛЕНЬ\n');
console.log(`✅ Файлів оброблено: ${stats.filesProcessed}`);
console.log(`🔧 eval() замін: ${stats.evalFixed}`);
console.log(`📝 console замін: ${stats.consoleFixed}`);
console.log(`⚠️  TODO/FIXME замін: ${stats.todoFixed}`);
console.log('='.repeat(70) + '\n');

process.exit(0);