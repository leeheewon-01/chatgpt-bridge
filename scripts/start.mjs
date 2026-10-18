#!/usr/bin/env node
// MCP entry point for the Claude Code and Codex plugins.
// Claude Code installs node_modules into its plugin cache by itself; Codex copies
// the repo without them. So on first start, install the locked dependencies here,
// then load the server. stdout is the MCP channel: everything else goes to stderr.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = (msg) => process.stderr.write(`[chatgpt-bridge] ${msg}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  log(`Node.js 22 or newer is required (this is ${process.version} at ${process.execPath}).`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const missing = () =>
  Object.keys(pkg.dependencies || {}).filter((d) => !fs.existsSync(path.join(root, 'node_modules', d, 'package.json')));

function npmCommand() {
  // Prefer the npm that ships next to this node; GUI apps may have a thin PATH.
  const bin = path.dirname(process.execPath);
  const local = path.join(bin, process.platform === 'win32' ? 'npm.cmd' : 'npm');
  return fs.existsSync(local) ? local : process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function installDeps() {
  const lock = path.join(root, '.install-lock');
  for (let i = 0; ; i++) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Another process is installing; wait for it (or take over a stale lock).
      const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? 0);
      if (!missing().length) return;
      if (age > 5 * 60_000) fs.rmSync(lock, { recursive: true, force: true });
      if (i % 10 === 0) log('waiting for another dependency install to finish...');
      await sleep(1000);
    }
  }
  try {
    if (!missing().length) return;
    log(`first start: installing dependencies in ${root} (about a minute)...`);
    const r = spawnSync(npmCommand(), ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: root,
      stdio: ['ignore', 2, 2],
      shell: process.platform === 'win32',
    });
    if (r.status !== 0) {
      log(`npm ci failed (${r.error?.message || `exit ${r.status}`}). Run "npm ci" in ${root} by hand.`);
      process.exit(1);
    }
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

if (missing().length) await installDeps();
await import(pathToFileURL(path.join(root, 'src', 'server.js')).href);
