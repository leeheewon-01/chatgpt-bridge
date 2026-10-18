import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const HOME = process.env.CHATGPT_BRIDGE_HOME || path.join(os.homedir(), '.chatgpt-bridge');

export const config = {
  root: ROOT,
  home: HOME,
  profileDir: path.join(HOME, 'profile'),
  jobsFile: path.join(HOME, 'jobs.json'),
  resultsDir: path.join(HOME, 'results'),
  launchLock: path.join(HOME, 'launch.lock'),
  port: Number(process.env.CHATGPT_BRIDGE_PORT || 9339),
  baseUrl: (process.env.CHATGPT_BRIDGE_BASE_URL || 'https://chatgpt.com').replace(/\/$/, ''),
  chromePath: process.env.CHATGPT_BRIDGE_CHROME || defaultChromePath(),
  // Only for the offline test suite; the real site is used headful.
  headless: process.env.CHATGPT_BRIDGE_HEADLESS === '1',
  cli: path.join(ROOT, 'src', 'cli.js'),
  selectorsFile: process.env.CHATGPT_BRIDGE_SELECTORS || path.join(ROOT, 'selectors.json'),
  // Local fixes that survive plugin updates: top-level keys here replace the bundled ones.
  selectorsOverride: path.join(HOME, 'selectors.json'),
};

function defaultChromePath() {
  const candidates = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    win32: [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ],
  }[process.platform] || [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

let cachedSelectors = null;
let cachedKey = '';

const mtimeOf = (file) => fs.statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0;

/**
 * selectors.json (plus the optional ~/.chatgpt-bridge/selectors.json override) is re-read
 * whenever either file changes, so fixes apply without restarting the MCP server.
 */
export function loadSelectors() {
  const key = `${mtimeOf(config.selectorsFile)}:${mtimeOf(config.selectorsOverride)}`;
  if (!cachedSelectors || key !== cachedKey) {
    const base = JSON.parse(fs.readFileSync(config.selectorsFile, 'utf8'));
    const override = fs.existsSync(config.selectorsOverride)
      ? JSON.parse(fs.readFileSync(config.selectorsOverride, 'utf8'))
      : {};
    cachedSelectors = { ...base, ...override };
    cachedKey = key;
  }
  return cachedSelectors;
}

export function ensureDirs() {
  for (const dir of [config.home, config.profileDir, config.resultsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
