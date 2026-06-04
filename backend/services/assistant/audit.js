'use strict';

const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.resolve(process.cwd(), 'logs/assistant-audit.log');

function write(entry) {
  if (String(process.env.ASSISTANT_AUDIT_LOG_ENABLED || 'true') !== 'true') {
    return;
  }

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry
  });

  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fs.appendFileSync(AUDIT_FILE, `${line}\n`, 'utf8');
}

module.exports = {
  write
};
