#!/usr/bin/env node
// Claude Code status line.
//
// Row 1: account  path  ⎇ branch  ↑ahead ↓behind  ⇅remote
// Row 2: model  ctx N% used/size  5h bar N% (reset)  7d bar N% (reset)
//
// Segments carry variants from fullest to most compact plus a drop priority;
// a row picks the variant per segment that fits the terminal width and never
// splits one. When the rate limits do not fit beside the model and context,
// they move to a row of their own.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// A repaint Claude Code abandons must not leave this process waiting on stdin.
setTimeout(() => process.exit(0), 5000).unref()

const ESC = '\x1b['
const RESET = `${ESC}0m`
const COLORS = {
  dim: `${ESC}2m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  red: `${ESC}31m`,
  cyan: `${ESC}36m`,
  magenta: `${ESC}35m`,
  blue: `${ESC}34m`,
  white: `${ESC}37m`,
}
const GAP = '  '
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** @typedef {{ text: string, color?: keyof COLORS }} Run */
/** @typedef {{ variants: Run[][], priority: number, optional?: boolean }} Segment */

const widthOf = runs => runs.reduce((sum, run) => sum + [...run.text].length, 0)

const tone = pct => (pct >= 80 ? 'red' : pct >= 50 ? 'yellow' : 'green')

const clamp = pct => Math.max(0, Math.min(100, Math.round(pct)))

function bar(pct, width) {
  const filled = Math.round((clamp(pct) / 100) * width)
  return [
    { text: '━'.repeat(filled), color: tone(pct) },
    { text: '─'.repeat(width - filled), color: 'dim' },
  ]
}

const pad = n => String(n).padStart(2, '0')

function countdown(ms) {
  const mins = Math.max(0, Math.floor(ms / 60_000))
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const rest = mins % 60
  if (days > 0) return `${days}d${hours}h`
  if (hours > 0) return `${hours}h${rest}m`
  return `${rest}m`
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(1))}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function modelName(model) {
  if (model?.display_name) return model.display_name.replace(/\s*\(.*\)$/, '')
  const id = String(model?.id ?? 'Claude').replace(/\[.*\]$/, '')
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id)
  if (!match) return id
  const [, family, major, minor] = match
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  return minor ? `${name} ${major}.${minor}` : `${name} ${major}`
}

function pathTail(dir, segments) {
  const parts = dir.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length <= segments) return parts.join('/')
  return `…/${parts.slice(-segments).join('/')}`
}

/** Picks a variant per segment so the row fits `columns`. */
function fit(segments, columns) {
  const present = segments.filter(s => s.variants.length > 0)
  const level = present.map(() => 0)
  const total = () =>
    present.reduce((sum, seg, i) => {
      const runs = seg.variants[level[i]]
      return runs ? sum + widthOf(runs) + (sum > 0 ? GAP.length : 0) : sum
    }, 0)

  while (total() > columns) {
    let pick = -1
    present.forEach((seg, i) => {
      const canShrink =
        level[i] < seg.variants.length - 1 || (seg.optional && level[i] < seg.variants.length)
      if (canShrink && (pick < 0 || seg.priority > present[pick].priority)) pick = i
    })
    if (pick < 0) break
    level[pick] += 1
  }

  const out = []
  present.forEach((seg, i) => {
    const runs = seg.variants[level[i]]
    if (!runs) return
    if (out.length > 0) out.push({ text: GAP })
    out.push(...runs)
  })
  return out
}

/** Width of the row when every required segment takes its most compact form. */
function minWidth(segments) {
  const widths = segments
    .filter(s => s.variants.length > 0 && !s.optional)
    .map(s => widthOf(s.variants[s.variants.length - 1]))
  return widths.reduce((sum, w) => sum + w, 0) + Math.max(0, widths.length - 1) * GAP.length
}

const paint = runs =>
  runs.map(run => (run.color ? `${COLORS[run.color]}${run.text}${RESET}` : run.text)).join('')

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** The signed-in account: Claude Code keeps it in .claude.json, not on stdin. */
function accountEmail() {
  const file = process.env.CLAUDE_CONFIG_DIR
    ? path.join(process.env.CLAUDE_CONFIG_DIR, '.claude.json')
    : path.join(os.homedir(), '.claude.json')
  return readJson(file)?.oauthAccount?.emailAddress ?? null
}

/** Whether Remote Control is bridging this session (sessions/<pid>.json). */
function isRemoteControlled(sessionId) {
  if (!sessionId) return false
  try {
    const dir = path.join(configDir(), 'sessions')
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue
      const rec = readJson(path.join(dir, name))
      if (rec?.sessionId === sessionId) {
        return typeof rec.bridgeSessionId === 'string' && rec.bridgeSessionId.length > 0
      }
    }
  } catch {
    // No session registry: not bridged.
  }
  return false
}

function gitState(cwd) {
  try {
    const out = execFileSync('git', ['status', '--porcelain=v2', '--branch', '--untracked-files=no'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    })
    const state = { branch: '', ahead: 0, behind: 0 }
    for (const line of out.split('\n')) {
      if (line.startsWith('# branch.head ')) {
        const head = line.slice('# branch.head '.length).trim()
        state.branch = head === '(detached)' ? 'detached' : head
      } else if (line.startsWith('# branch.ab ')) {
        const [ahead = '+0', behind = '-0'] = line.slice('# branch.ab '.length).trim().split(' ')
        state.ahead = Math.abs(Number(ahead)) || 0
        state.behind = Math.abs(Number(behind)) || 0
      }
    }
    return state
  } catch {
    return null
  }
}

function render(data) {
  const columns = Math.max(30, (Number(process.env.COLUMNS) || 120) - 4)
  const cwd = data?.workspace?.current_dir ?? data?.cwd ?? process.cwd()
  const repo = gitState(cwd)
  const email = accountEmail()
  const remote = isRemoteControlled(data?.session_id)

  // Row 1: account, location and git.
  const sync = []
  if (repo?.ahead) sync.push({ text: `↑${repo.ahead}`, color: 'cyan' })
  if (repo?.behind) sync.push({ text: `${repo.ahead ? ' ' : ''}↓${repo.behind}`, color: 'cyan' })
  const where = fit(
    [
      { priority: 5, optional: true, variants: email ? [[{ text: email, color: 'dim' }]] : [] },
      {
        priority: 1,
        variants: [
          [{ text: pathTail(cwd, 2), color: 'cyan' }],
          [{ text: pathTail(cwd, 1), color: 'cyan' }],
        ],
      },
      {
        priority: 0,
        variants: repo?.branch
          ? [[{ text: '⎇ ', color: 'dim' }, { text: repo.branch, color: 'magenta' }]]
          : [],
      },
      { priority: 3, optional: true, variants: sync.length ? [sync] : [] },
      { priority: 4, optional: true, variants: remote ? [[{ text: '⇅remote', color: 'blue' }]] : [] },
    ],
    columns,
  )

  // Row 2: model, context window and subscription limits.
  const cw = data?.context_window ?? {}
  const ctxPct = typeof cw.used_percentage === 'number' ? clamp(cw.used_percentage) : null
  const size = cw.context_window_size
  const used = cw.total_input_tokens
  const tokens = size ? `${typeof used === 'number' ? `${formatTokens(used)}/` : ''}${formatTokens(size)}` : ''
  const claude = [
    { priority: 0, variants: [[{ text: modelName(data?.model), color: 'white' }]] },
    {
      priority: 3,
      variants:
        ctxPct === null
          ? [[{ text: 'ctx ', color: 'dim' }, { text: '—', color: 'dim' }]]
          : [
              [
                { text: 'ctx ', color: 'dim' },
                { text: `${ctxPct}%`, color: tone(ctxPct) },
                ...(tokens ? [{ text: ` ${tokens}`, color: 'dim' }] : []),
              ],
              [{ text: 'ctx ', color: 'dim' }, { text: `${ctxPct}%`, color: tone(ctxPct) }],
            ],
    },
  ]

  const now = Date.now()
  const limits = []
  const addLimit = (label, window, withDay, base) => {
    const pct = window?.used_percentage
    if (typeof pct !== 'number' || !Number.isFinite(pct)) return
    const n = clamp(pct)
    const meter = width => [{ text: `${label} `, color: 'dim' }, ...bar(n, width), { text: ` ${n}%`, color: tone(n) }]
    limits.push({ priority: base, variants: [meter(6), meter(4)] })
    const at = window.resets_at ? new Date(Number(window.resets_at) * 1000) : null
    if (!at || Number.isNaN(at.getTime())) return
    const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`
    const when = withDay ? `${WEEKDAYS[at.getDay()]} ${clock}` : clock
    limits.push({
      priority: base + 4,
      variants: [
        [{ text: `(${when} · ${countdown(at.getTime() - now)})`, color: 'dim' }],
        [{ text: `(${when})`, color: 'dim' }],
      ],
    })
  }
  addLimit('5h', data?.rate_limits?.five_hour, false, 4)
  addLimit('7d', data?.rate_limits?.seven_day, true, 5)

  const together = [...claude, ...limits]
  const rows =
    limits.length === 0 || minWidth(together) <= columns
      ? [where, fit(together, columns)]
      : [where, fit(claude, columns), fit(limits, columns)]

  return rows.filter(row => row.length > 0).map(paint).join('\n')
}

const chunks = []
process.stdin.on('data', chunk => chunks.push(chunk))
process.stdin.on('end', () => {
  let data = {}
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    data = {}
  }
  try {
    process.stdout.write(render(data))
  } catch {
    process.stdout.write('')
  }
  process.exit(0)
})
