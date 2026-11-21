#!/usr/bin/env node
// Points statusLine in ~/.claude/settings.json at this repo's statusline.mjs.
// Only that key is written; every other setting is kept. settings.json is not
// versioned because it also holds permissions and other machine-local state.
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const file = path.join(configDir, 'settings.json');
// Forward slashes: Claude Code runs the command through a POSIX shell (Git Bash
// on Windows), where backslashes in the path are eaten.
const script = path.join(__dirname, 'statusline.mjs').replace(/\\/g, '/');

let settings = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, 'utf8');
  try { settings = JSON.parse(raw); } catch (e) {
    console.error(`${file} is not valid JSON; fix it first (${e.message})`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(configDir, { recursive: true });
}

const wanted = { type: 'command', command: `node "${script}"`, refreshInterval: 5 };
if (JSON.stringify(settings.statusLine) === JSON.stringify(wanted)) {
  console.log(`ok     statusLine already points at ${script}`);
  process.exit(0);
}
if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
settings.statusLine = wanted;
fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
console.log(`set    statusLine -> ${script} (previous settings saved to settings.json.bak)`);
