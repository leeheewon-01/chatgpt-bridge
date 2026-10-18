import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { config, ensureDirs } from './config.js';

// One dedicated Chrome (own profile, own debugging port) is shared by every
// bridge process: the Claude Code MCP server, the Codex MCP server and the CLI.
// It outlives them, so a 30-minute Pro answer survives an agent session ending.

let browser = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${config.port}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function launchChrome() {
  if (!fs.existsSync(config.chromePath)) {
    throw new Error(`Chrome not found at ${config.chromePath}. Set CHATGPT_BRIDGE_CHROME to the Chrome executable.`);
  }
  const args = [
    `--user-data-dir=${config.profileDir}`,
    `--remote-debugging-port=${config.port}`,
    '--no-first-run',
    '--no-default-browser-check',
    // Keep background tabs rendering so status checks see live DOM.
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--window-size=1280,900',
  ];
  if (config.headless) args.push('--headless=new');
  args.push(`${config.baseUrl}/`);
  const child = spawn(config.chromePath, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

/** Serialise launches across processes so two agents never start two Chromes on one profile. */
async function withLaunchLock(fn) {
  for (let i = 0; i < 60; i++) {
    try {
      const fd = fs.openSync(config.launchLock, 'wx');
      fs.closeSync(fd);
      try {
        return await fn();
      } finally {
        fs.rmSync(config.launchLock, { force: true });
      }
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      const age = Date.now() - fs.statSync(config.launchLock, { throwIfNoEntry: false })?.mtimeMs;
      if (age > 30_000) fs.rmSync(config.launchLock, { force: true });
      if (await cdpAlive()) return;
      await sleep(500);
    }
  }
  throw new Error('Timed out waiting for another process to launch Chrome.');
}

// On macOS Chrome keeps running after its last window is closed, and CDP
// clients then fail with "Browser context management is not supported".
async function ensureWindow() {
  const targets = await (await fetch(`http://127.0.0.1:${config.port}/json/list`)).json();
  if (targets.some((t) => t.type === 'page')) return;
  await fetch(`http://127.0.0.1:${config.port}/json/new?${config.baseUrl}/`, { method: 'PUT' });
  await sleep(1000);
}

export async function getBrowser({ launch = true } = {}) {
  if (browser?.isConnected()) return browser;
  ensureDirs();
  if (!(await cdpAlive())) {
    if (!launch) return null;
    await withLaunchLock(async () => {
      if (await cdpAlive()) return;
      launchChrome();
      for (let i = 0; i < 60 && !(await cdpAlive()); i++) await sleep(500);
    });
    if (!(await cdpAlive())) throw new Error(`Chrome did not open its debugging port ${config.port}.`);
  }
  await ensureWindow();
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${config.port}`);
  browser.on('disconnected', () => {
    browser = null;
  });
  return browser;
}

export async function getContext() {
  const b = await getBrowser();
  const [context] = b.contexts();
  if (!context) throw new Error('Connected to Chrome but found no browser context.');
  return context;
}

export async function browserRunning() {
  return cdpAlive();
}
