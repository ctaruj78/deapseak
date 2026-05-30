#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'docs', 'user-manual.md');
const pdfPath = path.join(root, 'docs', 'user-manual.pdf');

const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split(/\r?\n/);

const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  info: {
    Title: 'Manual do Utilizador (Cliente) - FestLift',
    Author: 'FestLift',
  },
});

doc.pipe(fs.createWriteStream(pdfPath));

doc.font('Helvetica-Bold').fontSize(20).text('Manual do Utilizador (Cliente) - FestLift');
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(11);
doc.fillColor('#111111').text('Video curto (35 segundos): ');
doc.fillColor('blue').text('https://crm.festlift.pt/docs/user-manual-short.webm', {
  link: 'https://crm.festlift.pt/docs/user-manual-short.webm',
  underline: true,
});
doc.fillColor('#111111');
doc.moveDown(0.7);

for (const raw of lines) {
  const line = raw.trimEnd();

  if (!line) {
    doc.moveDown(0.4);
    continue;
  }

  if (line.startsWith('# ')) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(16).text(line.slice(2));
    doc.font('Helvetica').fontSize(11);
    continue;
  }

  if (line.startsWith('## ')) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(13).text(line.slice(3));
    doc.font('Helvetica').fontSize(11);
    continue;
  }

  if (line.startsWith('### ')) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12).text(line.slice(4));
    doc.font('Helvetica').fontSize(11);
    continue;
  }

  if (line.startsWith('- ')) {
    doc.text(`• ${line.slice(2)}`);
    continue;
  }

  if (/^\d+\.\s/.test(line)) {
    doc.text(line);
    continue;
  }

  doc.text(line);
}

doc.end();
