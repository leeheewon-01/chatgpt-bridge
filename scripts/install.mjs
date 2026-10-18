#!/usr/bin/env node
// Install chatgpt-bridge from this clone into Claude Code and/or Codex.
//   node scripts/install.mjs            # both
//   node scripts/install.mjs claude     # or: codex
// Uses each tool's own plugin commands with this folder as a local marketplace, so a
// clone installs exactly what `/plugin marketplace add <owner>/chatgpt-bridge` would.
// Claude Code loads a local marketplace in place (edits apply in new sessions);
// Codex copies the plugin into its cache, so re-run this after editing for Codex.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();
const ID = 'chatgpt-bridge@chatgpt-bridge';
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);

const CODEX =
  process.env.CODEX_BIN ||
  firstExisting([which('codex'), '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex', '/Applications/Codex.app/Contents/Resources/codex']);
const CLAUDE = process.env.CLAUDE_BIN || firstExisting([which('claude'), path.join(HOME, '.local/bin/claude')]);

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}
function firstExisting(list) {
  return list.find((p) => p && fs.existsSync(p)) || null;
}
function run(bin, args, { allowFail = false } = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0 && !allowFail) throw new Error(`${path.basename(bin)} ${args.join(' ')} failed:\n${out}`);
  return { ok: r.status === 0, out };
}

function ensureDeps() {
  if (fs.existsSync(path.join(ROOT, 'node_modules', '@modelcontextprotocol', 'sdk'))) return;
  console.log('npm ci ...');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--no-audit', '--no-fund'], { cwd: ROOT, stdio: 'inherit' });
}

// Earlier versions of this script registered a user-scope MCP server, a skill symlink and a
// Codex "personal" marketplace entry. Remove those so the tools are not registered twice.
function removeLegacyClaude() {
  const get = run(CLAUDE, ['mcp', 'get', 'chatgpt_bridge'], { allowFail: true });
  if (get.ok && get.out.includes(path.join(ROOT, 'src', 'server.js'))) {
    run(CLAUDE, ['mcp', 'remove', '-s', 'user', 'chatgpt_bridge'], { allowFail: true });
    console.log('claude: removed the old user-scope chatgpt_bridge MCP server');
  }
  const link = path.join(HOME, '.claude', 'skills', 'chatgpt-bridge');
  const st = fs.lstatSync(link, { throwIfNoEntry: false });
  if (st?.isSymbolicLink() && path.resolve(path.dirname(link), fs.readlinkSync(link)).startsWith(ROOT)) {
    fs.unlinkSync(link);
    console.log(`claude: removed the old skill symlink ${link}`);
  }
}

function removeLegacyCodex() {
  const list = run(CODEX, ['plugin', 'list'], { allowFail: true }).out;
  if (/chatgpt-bridge@personal/.test(list)) {
    run(CODEX, ['plugin', 'remove', 'chatgpt-bridge@personal'], { allowFail: true });
    console.log('codex: removed the old chatgpt-bridge@personal plugin');
  }
  const market = path.join(HOME, '.agents', 'plugins', 'marketplace.json');
  if (!fs.existsSync(market)) return;
  const data = JSON.parse(fs.readFileSync(market, 'utf8'));
  const kept = (data.plugins || []).filter((p) => p.name !== 'chatgpt-bridge');
  if (kept.length === (data.plugins || []).length) return;
  fs.copyFileSync(market, `${market}.backup-${stamp}`);
  fs.writeFileSync(market, `${JSON.stringify({ ...data, plugins: kept }, null, 2)}\n`);
  console.log(`codex: removed the chatgpt-bridge entry from ${market} (backup saved next to it)`);
}

function installClaude() {
  if (!CLAUDE) return console.log('claude: CLI not found, skipped (set CLAUDE_BIN)');
  removeLegacyClaude();
  run(CLAUDE, ['plugin', 'marketplace', 'add', ROOT], { allowFail: true });
  const r = run(CLAUDE, ['plugin', 'install', ID], { allowFail: true });
  console.log(`claude: ${r.out.split('\n').at(-1) || (r.ok ? 'installed' : 'install failed')}`);
  if (!r.ok) throw new Error(r.out);
}

function installCodex() {
  if (!CODEX) return console.log('codex: CLI not found, skipped (set CODEX_BIN)');
  removeLegacyCodex();
  run(CODEX, ['plugin', 'marketplace', 'add', ROOT], { allowFail: true });
  // Re-adding the same version keeps the old cache copy, so remove first to refresh it.
  run(CODEX, ['plugin', 'remove', ID], { allowFail: true });
  const r = run(CODEX, ['plugin', 'add', ID]);
  console.log(`codex: ${r.out.split('\n').at(-1) || 'installed'}`);
}

ensureDeps();
const only = process.argv[2];
if (!only || only === 'claude') installClaude();
if (!only || only === 'codex') installCodex();
console.log('Done. Start a new Claude Code session / restart Codex to load the tools.');
