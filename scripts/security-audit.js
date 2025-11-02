#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ISSUES_DIR = './security-audit';
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.env', 'security-audit', '.vscode', '.idea'];

console.log('🔍 Запускаю повний аудит безпеки DeapSeaK...\n');

// Создаем папку для отчетов
if (!fs.existsSync(ISSUES_DIR)) {
  fs.mkdirSync(ISSUES_DIR, { recursive: true });
}

const issues = {
  eval: [],
  secrets: [],
  todo: [],
  console: [],
  xss: [],
  sqlInjection: [],
  hardcodedPasswords: []
};

// Функция для рекурсивного поиска
function isExcluded(filePath) {
  return EXCLUDE_DIRS.some(exclude => filePath.includes(exclude));
}

function scanDirectory(dir) {
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
          scanDirectory(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
          scanFile(fullPath);
        }
      } catch (err) {
        // ignore
      }
    });
  } catch (err) {
    // ignore
  }
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // eval()
      if (line.includes('eval(')) {
        issues.eval.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'CRITICAL'
        });
      }
      
      // Хардкоджені паролі
      if (/password\s*=\s*['"`][^'"`]+['"`]/i.test(line)) {
        issues.hardcodedPasswords.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'CRITICAL'
        });
      }
      
      // Секрети
      if (/password|secret|api.?key|token|auth/i.test(line) && !line.includes('//')) {
        if (!line.includes('process.env') && !line.includes('config.') && !line.includes('dotenv')) {
          issues.secrets.push({
            file: filePath,
            line: lineNum,
            code: line.trim().substring(0, 150),
            severity: 'HIGH'
          });
        }
      }
      
      // TODO/FIXME
      if (/TODO|FIXME|XXX|HACK/i.test(line)) {
        issues.todo.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'MEDIUM'
        });
      }
      
      // console
      if (/console\.(error|warn|log)/.test(line)) {
        issues.console.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'LOW'
        });
      }
      
      // XSS
      if (/innerHTML|dangerouslySetInnerHTML|document\.write/.test(line)) {
        issues.xss.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'HIGH'
        });
      }
      
      // SQL Injection
      if (/\+ |\.concat|template|`.*\$\{/.test(line) && /query|sql|select|insert|update|from|where/i.test(line)) {
        issues.sqlInjection.push({
          file: filePath,
          line: lineNum,
          code: line.trim().substring(0, 150),
          severity: 'CRITICAL'
        });
      }
    });
  } catch (err) {
    // ignore
  }
}

// Запуск сканирования
console.log('📂 Сканую всі JS файли...');
scanDirectory('.');

// Сохранение результатов
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const reportFile = path.join(ISSUES_DIR, `audit-report-${timestamp}.json`);

fs.writeFileSync(reportFile, JSON.stringify(issues, null, 2));

// РЕЗУЛЬТАТИ
console.log('\n' + '='.repeat(60));
console.log('📊 РЕЗУЛЬТАТИ АУДИТУ БЕЗПЕКИ\n');
console.log(`❌ eval() використання: ${issues.eval.length}`);
console.log(`🔐 Хардкоджені паролі: ${issues.hardcodedPasswords.length}`);
console.log(`🔑 Хардкоджені секрети: ${issues.secrets.length}`);
console.log(`📝 TODO/FIXME: ${issues.todo.length}`);
console.log(`🖥️  console.error/warn/log: ${issues.console.length}`);
console.log(`🔓 XSS уязвимості: ${issues.xss.length}`);
console.log(`💉 SQL Injection: ${issues.sqlInjection.length}`);
console.log('='.repeat(60));
console.log(`\n📄 Повний звіт збережено: ${reportFile}\n`);

// TOP критичних
const critical = [...issues.eval, ...issues.hardcodedPasswords, ...issues.sqlInjection, ...issues.xss]
  .slice(0, 15);

if (critical.length > 0) {
  console.log('🔴 ТОП КРИТИЧНИХ ПРОБЛЕМ:\n');
  critical.forEach((issue, idx) => {
    console.log(`${idx + 1}. [${issue.severity}] ${issue.file}:${issue.line}`);
    console.log(`   ${issue.code}\n`);
  });
}

console.log('\n✅ Аудит завершено!\n');
process.exit(0);