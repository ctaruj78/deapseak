#!/usr/bin/env node

/**
 * 🧭 COMPREHENSIVE NAVIGATION TEST
 * Перевіряє всі посилання в sidebar, menu, submenu на всіх сторінках
 * Знаходить broken links, неправильні шляхи, та missing files
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const results = {
    totalPages: 0,
    totalLinks: 0,
    brokenLinks: [],
    workingLinks: [],
    externalLinks: [],
    pageErrors: {}
};

// Знайти всі HTML файли
function findAllHTMLFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Пропускаємо backup та node_modules
            if (!filePath.includes('backup') && 
                !filePath.includes('node_modules') &&
                !filePath.includes('.git')) {
                findAllHTMLFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Перевірити чи файл існує
function checkFileExists(linkPath, currentPagePath) {
    try {
        // Зовнішні посилання
        if (linkPath.startsWith('http://') || linkPath.startsWith('https://') || linkPath.startsWith('//')) {
            return { exists: true, type: 'external', fullPath: linkPath };
        }
        
        // Anchor links (same page)
        if (linkPath.startsWith('#')) {
            return { exists: true, type: 'anchor', fullPath: linkPath };
        }
        
        // Javascript links
        if (linkPath.startsWith('javascript:')) {
            return { exists: true, type: 'javascript', fullPath: linkPath };
        }
        
        // Відносні посилання
        let fullPath;
        if (linkPath.startsWith('/')) {
            // Absolute from root
            fullPath = path.join('/workspaces/deapseak', linkPath);
        } else {
            // Relative to current file
            const currentDir = path.dirname(currentPagePath);
            fullPath = path.resolve(currentDir, linkPath);
        }
        
        // Видалити query strings та anchors
        fullPath = fullPath.split('?')[0].split('#')[0];
        
        const exists = fs.existsSync(fullPath);
        return { exists, type: 'internal', fullPath };
        
    } catch (error) {
        return { exists: false, type: 'error', fullPath: linkPath, error: error.message };
    }
}

// Витягти всі посилання з HTML файлу
function extractLinks(htmlPath) {
    try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        const $ = cheerio.load(html);
        const links = [];
        
        // Знайти всі <a> теги
        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            const classes = $(elem).attr('class') || '';
            
            // Визначити тип посилання
            let linkType = 'unknown';
            if (classes.includes('nav-link')) linkType = 'sidebar';
            else if (classes.includes('dropdown-item')) linkType = 'dropdown';
            else if (classes.includes('btn')) linkType = 'button';
            else if ($(elem).closest('nav').length) linkType = 'navigation';
            else if ($(elem).closest('.sidebar').length) linkType = 'sidebar';
            
            links.push({
                href,
                text: text.substring(0, 50), // Обмежити довжину
                type: linkType,
                line: 0 // cheerio не дає номер рядка, але можна додати пізніше
            });
        });
        
        return links;
    } catch (error) {
        console.error(`${COLORS.red}❌ Error reading ${htmlPath}:${COLORS.reset}`, error.message);
        return [];
    }
}

// Перевірити всі сторінки
function testAllPages() {
    console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║  🧭 COMPREHENSIVE NAVIGATION TEST                ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════╝${COLORS.reset}\n`);
    
    const htmlFiles = findAllHTMLFiles('/workspaces/deapseak/pages');
    results.totalPages = htmlFiles.length;
    
    console.log(`${COLORS.blue}📄 Знайдено HTML файлів: ${results.totalPages}${COLORS.reset}\n`);
    
    htmlFiles.forEach((filePath, index) => {
        const relativePath = filePath.replace('/workspaces/deapseak/', '');
        console.log(`${COLORS.yellow}[${index + 1}/${results.totalPages}]${COLORS.reset} Перевіряю: ${COLORS.magenta}${relativePath}${COLORS.reset}`);
        
        const links = extractLinks(filePath);
        results.totalLinks += links.length;
        
        const pageErrors = [];
        
        links.forEach(link => {
            const check = checkFileExists(link.href, filePath);
            
            if (check.type === 'external') {
                results.externalLinks.push({
                    page: relativePath,
                    link: link.href,
                    text: link.text
                });
            } else if (check.type === 'internal' && !check.exists) {
                const error = {
                    page: relativePath,
                    link: link.href,
                    text: link.text,
                    type: link.type,
                    expectedPath: check.fullPath
                };
                results.brokenLinks.push(error);
                pageErrors.push(error);
            } else if (check.exists) {
                results.workingLinks.push({
                    page: relativePath,
                    link: link.href
                });
            }
        });
        
        if (pageErrors.length > 0) {
            results.pageErrors[relativePath] = pageErrors;
            console.log(`  ${COLORS.red}❌ ${pageErrors.length} broken link(s)${COLORS.reset}`);
        } else {
            console.log(`  ${COLORS.green}✅ All links OK (${links.length} links)${COLORS.reset}`);
        }
    });
}

// Вивести результати
function printResults() {
    console.log(`\n${COLORS.cyan}╔═══════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║  📊 TEST RESULTS                                  ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════╝${COLORS.reset}\n`);
    
    console.log(`${COLORS.blue}📄 Total Pages Tested:${COLORS.reset} ${results.totalPages}`);
    console.log(`${COLORS.blue}🔗 Total Links Found:${COLORS.reset} ${results.totalLinks}`);
    console.log(`${COLORS.green}✅ Working Links:${COLORS.reset} ${results.workingLinks.length}`);
    console.log(`${COLORS.yellow}🌐 External Links:${COLORS.reset} ${results.externalLinks.length}`);
    console.log(`${COLORS.red}❌ Broken Links:${COLORS.reset} ${results.brokenLinks.length}\n`);
    
    if (results.brokenLinks.length > 0) {
        console.log(`${COLORS.red}╔═══════════════════════════════════════════════════╗${COLORS.reset}`);
        console.log(`${COLORS.red}║  ❌ BROKEN LINKS DETAILS                          ║${COLORS.reset}`);
        console.log(`${COLORS.red}╚═══════════════════════════════════════════════════╝${COLORS.reset}\n`);
        
        // Групувати по сторінках
        Object.keys(results.pageErrors).forEach(page => {
            console.log(`${COLORS.magenta}📄 ${page}${COLORS.reset}`);
            results.pageErrors[page].forEach((error, idx) => {
                console.log(`  ${idx + 1}. ${COLORS.yellow}[${error.type}]${COLORS.reset} "${error.text}"`);
                console.log(`     ${COLORS.red}Link:${COLORS.reset} ${error.link}`);
                console.log(`     ${COLORS.red}Expected:${COLORS.reset} ${error.expectedPath}`);
                console.log('');
            });
        });
    }
    
    // Статистика по типах broken links
    if (results.brokenLinks.length > 0) {
        const typeStats = {};
        results.brokenLinks.forEach(link => {
            typeStats[link.type] = (typeStats[link.type] || 0) + 1;
        });
        
        console.log(`${COLORS.cyan}📊 Broken Links by Type:${COLORS.reset}`);
        Object.entries(typeStats).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
    }
    
    // Підсумок
    console.log(`\n${COLORS.cyan}╔═══════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║  🎯 SUMMARY                                       ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════╝${COLORS.reset}\n`);
    
    const successRate = ((results.workingLinks.length / (results.totalLinks - results.externalLinks.length)) * 100).toFixed(2);
    
    if (results.brokenLinks.length === 0) {
        console.log(`${COLORS.green}✅ ✅ ✅ ALL NAVIGATION LINKS WORKING! ✅ ✅ ✅${COLORS.reset}`);
        console.log(`${COLORS.green}Success Rate: ${successRate}%${COLORS.reset}\n`);
    } else {
        console.log(`${COLORS.yellow}⚠️  NAVIGATION ISSUES FOUND${COLORS.reset}`);
        console.log(`${COLORS.yellow}Success Rate: ${successRate}%${COLORS.reset}`);
        console.log(`${COLORS.yellow}Please fix ${results.brokenLinks.length} broken link(s)${COLORS.reset}\n`);
    }
}

// Запустити тест
try {
    testAllPages();
    printResults();
    
    // Exit code
    process.exit(results.brokenLinks.length > 0 ? 1 : 0);
    
} catch (error) {
    console.error(`${COLORS.red}❌ Fatal error:${COLORS.reset}`, error);
    process.exit(1);
}
