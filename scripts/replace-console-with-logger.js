#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Заміна console.log на logger...\n');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'backups', 'security-audit', '.vscode', '.idea', 'scripts'];
const EXCLUDE_FILES = ['logger.js', 'replace-console-with-logger.js'];

let stats = {
  filesProcessed: 0,
  consoleReplaced: 0
};

function isExcluded(filePath) {
  const fileName = path.basename(filePath);
  return EXCLUDE_DIRS.some(exclude => filePath.includes(exclude)) ||
         EXCLUDE_FILES.includes(fileName);
}

function replaceConsoleInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if logger is already imported
    const hasLoggerImport = content.includes("require('./utils/logger')") || 
                           content.includes("require('../utils/logger')") ||
                           content.includes('from \'./utils/logger\'') ||
                           content.includes('from \'../utils/logger\'');
    
    // Count console calls
    const consoleLogCount = (content.match(/console\.log\(/g) || []).length;
    const consoleErrorCount = (content.match(/console\.error\(/g) || []).length;
    const consoleWarnCount = (content.match(/console\.warn\(/g) || []).length;
    const consoleInfoCount = (content.match(/console\.info\(/g) || []).length;
    
    const totalConsole = consoleLogCount + consoleErrorCount + consoleWarnCount + consoleInfoCount;
    
    if (totalConsole === 0) {
      return; // No console calls to replace
    }
    
    // Add logger import if not present
    if (!hasLoggerImport) {
      // Determine relative path to utils/logger.js
      const dirDepth = filePath.split(path.sep).length - 2; // -2 for file and root
      const relativePath = '../'.repeat(Math.max(dirDepth - 1, 0)) + 'utils/logger';
      
      // Add import at the top (after shebang if present)
      const lines = content.split('\n');
      let insertIndex = 0;
      
      if (lines[0].startsWith('#!')) {
        insertIndex = 1;
      }
      
      // Find first require/import or first non-comment line
      for (let i = insertIndex; i < Math.min(lines.length, 20); i++) {
        if (lines[i].includes('require(') || lines[i].includes('import ')) {
          insertIndex = i;
          break;
        }
      }
      
      lines.splice(insertIndex, 0, `const log = require('${relativePath}');`);
      content = lines.join('\n');
    }
    
    // Replace console calls
    content = content.replace(/console\.log\(/g, 'log.info(');
    content = content.replace(/console\.error\(/g, 'log.error(');
    content = content.replace(/console\.warn\(/g, 'log.warn(');
    content = content.replace(/console\.info\(/g, 'log.info(');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      stats.filesProcessed++;
      stats.consoleReplaced += totalConsole;
      
      console.log(`✅ ${filePath}`);
      console.log(`   📝 Замінено: ${totalConsole} console викликів`);
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
          replaceConsoleInFile(fullPath);
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
console.log('📊 РЕЗУЛЬТАТИ ЗАМІНИ\n');
console.log(`✅ Файлів оброблено: ${stats.filesProcessed}`);
console.log(`📝 Console викликів замінено: ${stats.consoleReplaced}`);
console.log('='.repeat(70) + '\n');

process.exit(0);