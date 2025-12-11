#!/usr/bin/env node

/**
 * Інтеграція всіх законів в єдину базу знань
 * - Decreto Regulamentar 13/80
 * - EN стандарти
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Інтеграція законів в базу знань AI...\n');

// Завантажити поточну базу
const mainDbPath = path.join(__dirname, 'data', 'portugal-lift-regulations.json');
const mainDb = JSON.parse(fs.readFileSync(mainDbPath, 'utf8'));

console.log('📚 Поточний стан бази:');
console.log(`   • Законів: ${mainDb.regulations.length}`);
console.log(`   • Violation codes: ${mainDb.violation_codes?.length || 0}`);

// Завантажити Decreto 13/80
const decreto1380Path = path.join(__dirname, 'data', 'regulations', 'decreto-regulamentar-13-80.json');
const decreto1380 = JSON.parse(fs.readFileSync(decreto1380Path, 'utf8'));

console.log('\n📜 Завантажено Decreto Regulamentar 13/80:');
console.log(`   • Змінених статей: ${decreto1380.articles?.length || 0}`);
console.log(`   • Inspection points: ${decreto1380.inspection_points?.length || 0}`);

// Завантажити EN standards
const enStandardsPath = path.join(__dirname, 'data', 'en-standards-lift-regulations.json');
const enStandards = JSON.parse(fs.readFileSync(enStandardsPath, 'utf8'));

console.log('\n🇪🇺 Завантажено EN Standards:');
console.log(`   • Стандартів: ${enStandards.standards?.length || 0}`);

// Перетворити Decreto 13/80 в формат regulation
const decreto1380Regulation = {
  id: decreto1380.id,
  type: decreto1380.type,
  number: decreto1380.number,
  date: decreto1380.date,
  title: decreto1380.title_pt,
  title_ua: decreto1380.title_ua,
  status: decreto1380.status,
  summary: decreto1380.summary_pt,
  summary_ua: decreto1380.summary_ua,
  scope: decreto1380.scope || [],
  source: {
    file: "decreto-regulamentar-13-80.json",
    sections_count: 1,
    critical_articles: decreto1380.key_changes?.length || 0
  },
  inspection_points: decreto1380.inspection_points || [],
  articles: decreto1380.articles || [],
  key_changes: decreto1380.key_changes || [],
  modifications_to: decreto1380.modifications_to,
  effective_date: decreto1380.effective_date,
  authority: decreto1380.authority
};

// Додати EN standards як окрему секцію
const enRegulations = enStandards.standards.map(std => ({
  id: std.id,
  type: "norma_europeia",
  number: std.number,
  date: std.publication_date,
  title: std.title,
  title_en: std.title_en,
  status: std.status,
  summary: std.summary,
  summary_en: std.summary_en,
  scope: std.scope || [],
  source: {
    file: "en-standards-lift-regulations.json",
    sections_count: std.sections?.length || 0,
    key_requirements: std.key_requirements?.length || 0
  },
  sections: std.sections || [],
  key_requirements: std.key_requirements || [],
  applicability: std.applicability || {},
  portuguese_law: std.portuguese_law
}));

// Перевірити чи вже є в базі
const existingIds = mainDb.regulations.map(r => r.id);

let addedCount = 0;

// Додати Decreto 13/80 якщо немає
if (!existingIds.includes(decreto1380Regulation.id)) {
  mainDb.regulations.push(decreto1380Regulation);
  addedCount++;
  console.log('\n✅ Додано: Decreto Regulamentar 13/80');
} else {
  console.log('\n⚠️  Decreto 13/80 вже в базі');
}

// Додати EN standards якщо немає
for (const enReg of enRegulations) {
  if (!existingIds.includes(enReg.id)) {
    mainDb.regulations.push(enReg);
    addedCount++;
    console.log(`✅ Додано: ${enReg.title}`);
  }
}

// Оновити метадані
const totalArticles = mainDb.regulations.reduce((sum, reg) => {
  return sum + (reg.articles?.length || 0) + (reg.sections?.length || 0);
}, 0);

mainDb.metadata.laws_count = mainDb.regulations.length;
mainDb.metadata.total_articles = totalArticles;
mainDb.metadata.last_updated = new Date().toISOString().split('T')[0];
mainDb.metadata.version = "4.0";
mainDb.metadata.latest_addition = "EN Standards + Decreto Regulamentar 13/80";

// Зберегти оновлену базу
fs.writeFileSync(mainDbPath, JSON.stringify(mainDb, null, 2), 'utf8');

console.log('\n' + '='.repeat(60));
console.log('✅ ІНТЕГРАЦІЯ ЗАВЕРШЕНА!');
console.log('='.repeat(60));
console.log(`\n📊 Нова статистика бази:`);
console.log(`   • Законів: ${mainDb.metadata.laws_count}`);
console.log(`   • Статей/Секцій: ${mainDb.metadata.total_articles}`);
console.log(`   • Додано: ${addedCount} нових регуляцій`);
console.log(`   • Версія: ${mainDb.metadata.version}`);
console.log(`   • Оновлено: ${mainDb.metadata.last_updated}`);
console.log('\n💾 Файл збережено: data/portugal-lift-regulations.json');

// Показати список всіх законів
console.log('\n📚 Повний список законів у базі:');
mainDb.regulations.forEach((reg, i) => {
  const articlesCount = reg.articles?.length || reg.sections?.length || 0;
  console.log(`   ${i + 1}. ${reg.number} - ${reg.title} (${articlesCount} статей/секцій)`);
});

console.log('\n🎉 Готово!\n');
