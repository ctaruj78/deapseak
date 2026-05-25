#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FestLift — Авто-спостерігач за змінами файлів
 *  Запускає healthcheck після кожної зміни HTML/JS/CSS
 *  Запуск: node scripts/watch-and-check.js
 * ═══════════════════════════════════════════════════════════════════
 */

const fs     = require('fs');
const path   = require('path');
const { execSync, spawn } = require('child_process');

const ROOT    = path.join(__dirname, '..');
const DELAY   = 2000; // ms після останньої зміни перед перевіркою

const C = {
    reset:  '\x1b[0m', red:  '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', cyan: '\x1b[36m', bold:  '\x1b[1m', gray: '\x1b[90m',
};

let timer = null;
let changedFiles = new Set();
let checkRunning = false;

console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════${C.reset}`);
console.log(`${C.bold}${C.cyan}  FestLift — Авто Health Check Watcher${C.reset}`);
console.log(`${C.bold}${C.cyan}  Спостерігаю за змінами...${C.reset}`);
console.log(`${C.bold}${C.cyan}═══════════════════════════════════════${C.reset}\n`);
console.log(`${C.gray}Ctrl+C для зупинки${C.reset}\n`);

function runHealthCheck(files) {
    if (checkRunning) return;
    checkRunning = true;

    console.log(`\n${C.yellow}[ЗМІНА ВИЯВЛЕНО]${C.reset} Файли:`);
    files.forEach(f => console.log(`  ${C.cyan}→ ${path.relative(ROOT, f)}${C.reset}`));
    console.log(`${C.yellow}Запускаю перевірку...${C.reset}\n`);

    const check = spawn('node', [path.join(__dirname, 'healthcheck.js'), '--fix'], {
        stdio: 'inherit',
        cwd: ROOT,
    });

    check.on('close', (code) => {
        checkRunning = false;
        if (code === 0) {
            console.log(`\n${C.green}✅ Перевірка пройдена — все ОК${C.reset}`);
        } else {
            console.log(`\n${C.red}❌ ЗНАЙДЕНО ПРОБЛЕМИ (код: ${code})${C.reset}`);
            console.log(`${C.yellow}Запустіть: node scripts/healthcheck.js --fix --api для повної діагностики${C.reset}`);
        }
        console.log(`\n${C.gray}Спостерігаю за змінами...${C.reset}`);
        changedFiles.clear();
    });
}

function onFileChange(eventType, filepath) {
    changedFiles.add(filepath);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        const files = [...changedFiles];
        runHealthCheck(files);
    }, DELAY);
}

// Функція для рекурсивного спостереження
function watchDir(dir, depth = 0) {
    if (depth > 5) return;

    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return; }

    for (const entry of entries) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const skip = ['node_modules', '.git', '.pm2', 'logs', '.cache'];
            if (skip.includes(entry.name)) continue;
            watchDir(full, depth + 1);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (!['.html', '.js', '.css', '.json'].includes(ext)) continue;
            if (entry.name.includes('.min.')) continue; // пропускаємо мінфіковані

            try {
                fs.watch(full, { persistent: true }, (eventType) => {
                    // Уникаємо healthcheck.js та watch-and-check.js самих себе
                    if (full.includes('healthcheck.js') || full.includes('watch-and-check.js')) return;
                    onFileChange(eventType, full);
                });
            } catch (e) { /* файл може бути недоступний */ }
        }
    }
}

// Запускаємо спостереження
watchDir(ROOT);
watchDir(path.join(ROOT, 'pages'));

console.log(`${C.green}Спостерігаю за HTML/JS/CSS файлами...${C.reset}`);
console.log(`${C.gray}Зміна будь-якого файлу → автоматична перевірка через ${DELAY/1000}с${C.reset}\n`);

// Початкова перевірка при старті
console.log(`${C.cyan}Початкова перевірка...${C.reset}`);
runHealthCheck(['startup']);
