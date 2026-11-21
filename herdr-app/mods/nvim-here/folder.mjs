// Prints the folder to open Neovim in.
//   node folder.mjs <pane cwd> [claude]
// Plain pane: its cwd. Claude pane: the git root of the last file Claude edited
// (Write/Edit/NotebookEdit) in the newest session started from that cwd, since
// Claude can edit other projects without its folder changing. Falls back to cwd.
// Adapted from fazt/dotfiles herdr/scripts/nvim-here.mjs.
import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';

const [cwd = process.cwd(), kind] = process.argv.slice(2);
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const EDIT_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const MAX_TAIL = 64 * 1024 * 1024;
const IGNORED = [tmpdir(), CLAUDE_DIR];

const isInside = (parent, path) => {
  const rel = relative(parent, path);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
};

// Claude stores sessions in ~/.claude/projects/<cwd with non-alphanumerics as "-">.
function newestTranscript(dir) {
  const project = join(CLAUDE_DIR, 'projects', dir.replace(/[^A-Za-z0-9]/g, '-'));
  if (!existsSync(project)) return null;
  const files = readdirSync(project)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(project, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ?? null;
}

function readTail(file) {
  const { size } = statSync(file);
  const length = Math.min(size, MAX_TAIL);
  const buffer = Buffer.alloc(length);
  const fd = openSync(file, 'r');
  readSync(fd, buffer, 0, length, size - length);
  closeSync(fd);
  return buffer.toString('utf8');
}

function lastEditedPath(transcript) {
  const lines = readTail(transcript).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('_path"')) continue;
    let entry;
    try { entry = JSON.parse(lines[i]); } catch { continue; } // first line of the tail may be cut
    const blocks = entry.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const block of [...blocks].reverse()) {
      if (block.type !== 'tool_use' || !EDIT_TOOLS.has(block.name)) continue;
      const path = block.input?.file_path || block.input?.notebook_path;
      if (!path || IGNORED.some((dir) => isInside(dir, path))) continue;
      if (existsSync(dirname(path))) return path;
    }
  }
  return null;
}

function projectRoot(path) {
  const start = dirname(path);
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return start;
  }
}

let folder = cwd;
if (kind === 'claude') {
  try {
    const transcript = newestTranscript(cwd);
    const path = transcript && lastEditedPath(transcript);
    if (path) folder = projectRoot(path);
  } catch {
    // Without Claude data the shortcut must still open nvim.
  }
}
process.stdout.write(folder);
