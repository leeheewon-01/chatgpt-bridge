import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getContext, browserRunning } from './browser.js';
import { config, loadSelectors } from './config.js';
import { pageOp } from './dom.js';
import { htmlToMarkdown } from './extract.js';
import { deepResearchWidget, widgetState, widgetPhase, reportMarkdown, stripCitations } from './deepresearch.js';
import { getJob, saveJob, listJobs, conversationIdFromUrl, isProvisionalId } from './jobs.js';

export class BridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const SELECTOR_FIX = `Run chatgpt_inspect, then put corrected candidates in ${config.selectorsOverride} (top-level keys there replace the bundled selectors.json; re-read on every call).`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nonce = () => crypto.randomBytes(6).toString('hex');
const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic|heif|bmp|avif)$/i;

const op = (page, name, arg) => page.evaluate(pageOp, { op: name, sel: loadSelectors(), arg });

async function find(page, key, { label, timeout = 0, within } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const id = nonce();
    const r = await op(page, 'mark', { key, label, nonce: id, within });
    if (r.found) return { ...r, nonce: id, locator: page.locator(`[data-cgb="${id}"]`) };
    if (Date.now() >= deadline) return null;
    await sleep(300);
  }
}

async function click(page, key, opts = {}) {
  const { timeout = 10_000 } = opts;
  const deadline = Date.now() + timeout;
  for (;;) {
    const el = await find(page, key, { ...opts, timeout: 0 });
    if (el && !el.disabled) {
      await el.locator.click({ timeout: 5_000 });
      return el;
    }
    if (Date.now() >= deadline) {
      throw new BridgeError('selector', `Could not find a clickable "${key}"${opts.label ? ` matching /${opts.label}/` : ''}. The ChatGPT UI may have changed: ${SELECTOR_FIX}`);
    }
    await sleep(300);
  }
}

// ---------------------------------------------------------------- pages

function isChatgptUrl(url) {
  return url.startsWith(config.baseUrl);
}

async function settle(page, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const s = await op(page, 'snapshot').catch(() => null);
    if (s && (s.composerVisible || s.loginVisible || s.challenge)) return s;
    await sleep(500);
  }
  return op(page, 'snapshot');
}

async function openPage(url) {
  const ctx = await getContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle(page);
  return page;
}

async function pageForJob(job, { create = true } = {}) {
  const ctx = await getContext();
  const id = conversationIdFromUrl(job.url);
  const existing = ctx.pages().find((p) => (id ? conversationIdFromUrl(p.url()) === id : p.url() === job.url));
  if (existing) return existing;
  if (!create) return null;
  return openPage(job.url);
}

function readiness(snap) {
  if (snap.challenge) {
    return new BridgeError('challenge', 'ChatGPT is showing a browser check (Cloudflare). Ask the user to complete it in the chatgpt-bridge Chrome window, then retry.');
  }
  if (snap.loginVisible) {
    return new BridgeError('needs_login', 'Not logged in to ChatGPT. Call chatgpt_login, ask the user to sign in in the Chrome window that opens, then retry.');
  }
  if (!snap.composerVisible) {
    return new BridgeError('selector', `ChatGPT loaded but no message composer was found. ${SELECTOR_FIX}`);
  }
  return null;
}

// ------------------------------------------------------------- composing

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function openModelMenu(page) {
  await click(page, 'modelSwitcher', { timeout: 8_000 });
  await sleep(600);
}

async function closeMenus(page) {
  await page.keyboard.press('Escape');
  await sleep(400);
}

/** Pick an entry of the version list (Latest, GPT-5.6 Sol, ...) by regex. */
async function selectVersion(page, pattern) {
  await openModelMenu(page);
  const item = await find(page, 'modelVersionItem', { label: pattern, timeout: 1_500 });
  if (!item) {
    const labels = await op(page, 'listLabels', { key: 'modelVersionItem' });
    await closeMenus(page);
    throw new BridgeError('model', `No model version matches /${pattern}/. Available: ${labels.join(' | ') || '(none found)'}`);
  }
  await item.locator.click();
  await sleep(500);
  if (await find(page, 'powerSlider')) await closeMenus(page);
  return item.label;
}

/** Move the power slider (Instant … Pro) to the named level with the keyboard. */
async function setPower(page, level) {
  await openModelMenu(page);
  const slider = await find(page, 'powerSlider', { timeout: 3_000 });
  if (!slider) {
    await closeMenus(page);
    throw new BridgeError('selector', `Model menu opened but no power slider was found. ${SELECTOR_FIX}`);
  }
  await slider.locator.focus();
  await page.keyboard.press('Home');
  await sleep(300);
  const want = new RegExp(`^${escapeRe(level)}$`, 'i');
  const seen = [];
  for (let i = 0; i < 10; i++) {
    const st = await op(page, 'powerState');
    seen.push(st.level);
    if (want.test(st.level)) {
      await closeMenus(page);
      return st.level;
    }
    if (st.now >= st.max) break;
    await page.keyboard.press('ArrowRight');
    await sleep(300);
  }
  await closeMenus(page);
  throw new BridgeError('model', `No power level "${level}". Levels: ${seen.join(' | ')}`);
}

async function enableDeepResearch(page) {
  await click(page, 'addMenuButton');
  await sleep(400);
  try {
    await click(page, 'deepResearchMenuItem', { timeout: 5_000 });
  } catch (err) {
    await closeMenus(page);
    throw err;
  }
  await sleep(600);
  return !!(await find(page, 'deepResearchToken', { timeout: 2_000 }));
}

async function attachFiles(page, files) {
  const input = await find(page, 'fileInput');
  if (input) {
    await input.locator.setInputFiles(files);
  } else {
    await click(page, 'addMenuButton');
    const chooser = page.waitForEvent('filechooser', { timeout: 10_000 });
    await click(page, 'addFilesMenuItem', { timeout: 5_000 });
    await (await chooser).setFiles(files);
  }
}

// Type at the end of the composer instead of replacing its content, so tokens
// already in it (the Deep research app mention) survive.
async function typePrompt(page, prompt) {
  const box = await find(page, 'composer', { timeout: 10_000 });
  if (!box) throw new BridgeError('selector', 'Message composer not found.');
  await box.locator.focus();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
  await page.keyboard.insertText(prompt);
  await sleep(300);
  const typed = norm(await op(page, 'composerText'));
  const want = norm(prompt);
  if (!typed.includes(want.slice(0, 60)) || !typed.includes(want.slice(-60))) {
    throw new BridgeError('input', 'The prompt did not land in the composer intact; nothing was sent.');
  }
}

async function waitSendReady(page, files, timeout = 180_000) {
  const names = files.filter((f) => !IMAGE_EXT.test(f)).map((f) => path.basename(f));
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    state = await op(page, 'sendState');
    const area = names.length ? await op(page, 'composerArea') : '';
    const chipsShown = names.every((n) => area.includes(n));
    if (state.found && !state.disabled && !state.busy && chipsShown) return;
    await sleep(700);
  }
  throw new BridgeError('upload', `Send button never became ready (found=${state?.found}, disabled=${state?.disabled}, uploading=${state?.busy}). An upload may have failed or been rejected.`);
}

async function sendAndConfirm(page, before, timeout = 90_000) {
  await click(page, 'sendButton');
  const deadline = Date.now() + timeout;
  let sent = false;
  while (Date.now() < deadline) {
    const snap = await op(page, 'snapshot');
    sent ||= snap.userCount > before.userCount || snap.stopVisible || snap.replyCount > before.replyCount;
    const id = conversationIdFromUrl(page.url());
    // Wait for the server id so the job URL can be reopened later.
    if (sent && id && !isProvisionalId(id)) return id;
    await sleep(500);
  }
  const id = conversationIdFromUrl(page.url());
  if (sent && id) return id;
  throw new BridgeError('send', `Could not confirm the message was sent (page is at ${page.url()}).`);
}

function resolveFiles(files = []) {
  return files.map((f) => {
    const abs = path.resolve(f.replace(/^~(?=$|\/)/, process.env.HOME));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new BridgeError('file', `File not found: ${abs}`);
    return abs;
  });
}

// --------------------------------------------------------------- status

function classify(job, s1, s2) {
  if (s1.challenge) return 'challenge';
  if (s1.loginVisible) return 'needs_login';
  const s = s2 || s1;
  if (s.stopVisible || s.busyVisible) return 'generating';
  if (s.replyCount === 0) return 'waiting';
  if (s.errorInLast && !s.copyInLastTurn) return 'error';
  if (s.copyInLastTurn) return 'completed';
  const stable = s2 && s2.lastLen === s1.lastLen && s2.lastLen > 0;
  // Deep research shows progress text with no stop button; only trust the action bar there.
  if (stable && job.mode !== 'deep_research') return 'completed';
  return 'generating';
}

// Deep research runs in an app iframe whose own state is authoritative; the chat
// message next to it ("심층 리서치를 시작했습니다…") finishes immediately.
async function researchWidget(page, job) {
  const parts = loadSelectors().deepResearchAppFrame || [];
  return deepResearchWidget(page, parts, { waitMs: job.mode === 'deep_research' ? 20_000 : 0 });
}

function researchSummary(w) {
  return {
    phase: widgetPhase(w),
    title: w.title,
    plan: w.steps.map((s) => s.text),
    plan_auto_start_at: widgetPhase(w) === 'plan' ? w.planAutoStartAt : undefined,
    started_at: w.startedAt,
    stopped_at: w.stoppedAt,
  };
}

async function snapshotStatus(job) {
  const page = await pageForJob(job);
  const s1 = await op(page, 'snapshot');
  let s2 = null;
  if (!s1.stopVisible && !s1.copyInLastTurn && s1.replyCount > 0) {
    await sleep(1_500);
    s2 = await op(page, 'snapshot');
  }
  const s = s2 || s1;
  let state = classify(job, s1, s2);
  const widget = ['challenge', 'needs_login'].includes(state) ? null : await researchWidget(page, job);
  if (widget) state = widgetState(widget);
  const tail = norm(s.lastTail).slice(-600);
  return {
    page,
    widget,
    status: {
      job_id: job.id,
      state,
      mode: job.mode,
      model: job.model || null,
      url: page.url(),
      elapsed_sec: job.submittedAt ? Math.round((Date.now() - Date.parse(job.submittedAt)) / 1000) : null,
      reply_chars: widget?.report ? widget.report.text.length : s.lastLen,
      preview: widget ? norm(stripCitations(widget.report?.text || '')).slice(-600) || `${widgetPhase(widget)}: ${widget.title || ''}` : tail,
      deep_research: widget ? researchSummary(widget) : undefined,
      // Without an app widget, a short question-ending reply means Deep research wants clarification.
      looks_like_questions:
        !widget && state === 'completed' && job.mode === 'deep_research' && s.lastLen < 4000 && /[?？]/.test(s.lastTail),
    },
  };
}

// ------------------------------------------------------------ public API

export async function session() {
  const ctx = await getContext();
  let page = ctx.pages().find((p) => isChatgptUrl(p.url()));
  if (!page) page = await openPage(`${config.baseUrl}/`);
  const snap = await settle(page);
  const err = readiness(snap);
  return {
    browser: 'running',
    port: config.port,
    profile: config.profileDir,
    logged_in: !snap.loginVisible && snap.composerVisible,
    state: err ? err.code : 'ready',
    message: err ? err.message : 'Logged in and ready.',
    open_tabs: ctx.pages().filter((p) => isChatgptUrl(p.url())).length,
    // Where things live, for the skill: the CLI for long background waits and the selector files.
    cli: `node ${config.cli}`,
    selectors_file: config.selectorsFile,
    selectors_override: config.selectorsOverride,
  };
}

export async function login() {
  const ctx = await getContext();
  let page = ctx.pages().find((p) => isChatgptUrl(p.url()));
  if (!page) page = await openPage(`${config.baseUrl}/`);
  await page.bringToFront();
  const snap = await settle(page);
  const err = readiness(snap);
  return {
    state: err ? err.code : 'ready',
    message: err
      ? 'A Chrome window with ChatGPT is open. Ask the user to sign in there (including any 2FA or browser check). The session is stored in the bridge profile, so this is needed only once.'
      : 'Already logged in.',
  };
}

export async function submit({ prompt, files = [], mode = 'default', modelVersion }) {
  if (!prompt || !prompt.trim()) throw new BridgeError('input', 'prompt is empty.');
  const sel = loadSelectors();
  const modeCfg = sel.modes?.[mode];
  if (!modeCfg) throw new BridgeError('input', `Unknown mode "${mode}". Known: ${Object.keys(sel.modes || {}).join(', ')}`);
  const absFiles = resolveFiles(files);

  // On failure the tab stays open so the user can see what went wrong.
  const page = await openPage(`${config.baseUrl}/`);
  const err = readiness(await op(page, 'snapshot'));
  if (err) throw err;

  if (modelVersion) await selectVersion(page, modelVersion);
  if (modeCfg.power) await setPower(page, modeCfg.power);
  const activeModel = (await find(page, 'modelSwitcher'))?.text || null;
  let deepResearchVerified = null;
  if (modeCfg.deepResearch) deepResearchVerified = await enableDeepResearch(page);
  if (absFiles.length) await attachFiles(page, absFiles);
  await typePrompt(page, prompt);
  await waitSendReady(page, absFiles);

  const before = await op(page, 'snapshot');
  const id = await sendAndConfirm(page, before);
  const now = new Date().toISOString();
  const job = saveJob({
    id,
    url: page.url(),
    mode,
    model: activeModel,
    promptPreview: prompt.slice(0, 200),
    files: absFiles,
    createdAt: now,
    submittedAt: now,
    turns: 1,
  });
  return {
    job_id: job.id,
    url: job.url,
    mode,
    active_model: activeModel,
    deep_research_verified: deepResearchVerified,
    next: 'Poll with chatgpt_wait (or chatgpt_status) until state is "completed", then chatgpt_fetch.',
    // For agents that can run a background shell: blocks until done and saves the answer.
    wait_command: `node ${JSON.stringify(config.cli)} wait ${job.id} --timeout 3600 --out <abs path.md> --notify`,
  };
}

export async function reply({ jobId, text, files = [] }) {
  const job = getJob(jobId);
  const absFiles = resolveFiles(files);
  const page = await pageForJob(job);
  const snap = await op(page, 'snapshot');
  const err = readiness(snap);
  if (err) throw err;
  if (snap.stopVisible) throw new BridgeError('busy', 'ChatGPT is still generating in this conversation. Wait for it to finish first.');
  if (absFiles.length) await attachFiles(page, absFiles);
  await typePrompt(page, text);
  await waitSendReady(page, absFiles);
  await sendAndConfirm(page, snap);
  const now = new Date().toISOString();
  saveJob({ id: job.id, url: job.url, mode: job.mode, submittedAt: now, turns: (job.turns || 1) + 1, createdAt: job.createdAt || now });
  return { job_id: job.id, url: page.url(), turns: (job.turns || 1) + 1 };
}

export async function status({ jobId }) {
  return (await snapshotStatus(getJob(jobId))).status;
}

export async function wait({ jobId, timeoutSec = 45, intervalSec = 5, onTick }) {
  const job = getJob(jobId);
  const deadline = Date.now() + timeoutSec * 1000;
  let last;
  for (let tick = 1; ; tick++) {
    last = (await snapshotStatus(job)).status;
    if (!['generating', 'waiting'].includes(last.state)) return { ...last, timed_out: false };
    if (Date.now() + intervalSec * 1000 > deadline) return { ...last, timed_out: true };
    await onTick?.(tick, last);
    await sleep(intervalSec * 1000);
  }
}

// Click the reply's own copy button with the page clipboard API stubbed out, so
// ChatGPT's Markdown serializer does the work and the user's clipboard is untouched.
async function copyMarkdown(page, all) {
  const id = nonce();
  const { marked } = await op(page, 'markReplyCopies', { nonce: id, all });
  if (!marked) return null;
  await page.evaluate(() => {
    const cb = navigator.clipboard;
    window.__cgb = { copied: [], writeText: cb.writeText, write: cb.write };
    cb.writeText = async (text) => void window.__cgb.copied.push(text);
    cb.write = async (items) => {
      for (const item of items) {
        if (item.types.includes('text/plain')) window.__cgb.copied.push(await (await item.getType('text/plain')).text());
      }
    };
  });
  const parts = [];
  try {
    for (let i = 0; i < marked; i++) {
      const before = await page.evaluate(() => window.__cgb.copied.length);
      await page.locator(`[data-cgb="${id}-${i}"]`).click({ timeout: 5_000 });
      for (let t = 0; t < 30; t++) {
        const copied = await page.evaluate((n) => window.__cgb.copied.slice(n), before);
        if (copied.length) {
          parts.push(copied.join('\n'));
          break;
        }
        await sleep(100);
      }
    }
  } finally {
    await page.evaluate(() => {
      navigator.clipboard.writeText = window.__cgb.writeText;
      navigator.clipboard.write = window.__cgb.write;
    });
  }
  return parts.length === marked ? parts.join('\n\n---\n\n') : null;
}

const cleanLinks = (md) => md.replace(/([?&])utm_source=chatgpt\.com(&?)/g, (m, sep, tail) => (tail ? sep : ''));

export async function fetchResult({ jobId, outPath, all = false, closeTab = false, force = false }) {
  const job = getJob(jobId);
  const { page, widget, status: st } = await snapshotStatus(job);
  if (st.state !== 'completed' && !force) {
    return { ...st, saved: false, message: `Not finished yet (state: ${st.state}). Pass force=true to save the partial answer.` };
  }
  const r = await op(page, 'extract', { all });
  let markdown = null;
  let via = 'deep_research';
  if (widget?.report?.text) markdown = reportMarkdown(widget.report);
  if (!markdown) {
    via = 'copy';
    markdown = await copyMarkdown(page, all).catch(() => null);
  }
  if (!markdown) {
    via = 'dom';
    let html = r.html;
    if (!norm(html) && r.iframes.length) {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        const body = await frame.evaluate(() => document.body?.innerHTML || '').catch(() => '');
        if (norm(body)) html += `\n${body}`;
      }
    }
    markdown = htmlToMarkdown(html) || norm(r.text);
  }
  markdown = cleanLinks(markdown).trim();
  const header = [
    '---',
    `source: ${page.url()}`,
    `mode: ${job.mode}`,
    job.model ? `model: ${JSON.stringify(job.model)}` : null,
    `fetched_at: ${new Date().toISOString()}`,
    '---',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
  const doc = `${header}${markdown}\n`;

  const archive = path.join(config.resultsDir, `${job.id}.md`);
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  fs.writeFileSync(archive, doc);
  let target = archive;
  if (outPath) {
    target = path.resolve(outPath.replace(/^~(?=$|\/)/, process.env.HOME));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, doc);
  }
  saveJob({ id: job.id, url: job.url, mode: job.mode, fetchedAt: new Date().toISOString(), resultPath: target, createdAt: job.createdAt });
  if (closeTab) await page.close().catch(() => {});
  const INLINE_LIMIT = 30_000;
  return {
    job_id: job.id,
    state: st.state,
    saved: true,
    path: target,
    chars: markdown.length,
    messages: widget?.report ? 1 : r.count,
    extracted_via: via,
    markdown: markdown.length <= INLINE_LIMIT ? markdown : undefined,
    preview: markdown.length > INLINE_LIMIT ? `${markdown.slice(0, 2000)}\n…(truncated; read the file)` : undefined,
  };
}

export async function closeJob({ jobId }) {
  const page = await pageForJob(getJob(jobId), { create: false });
  if (page) await page.close();
  return { closed: !!page };
}

export async function inspect({ jobId } = {}) {
  let page;
  if (jobId) page = await pageForJob(getJob(jobId));
  else {
    const ctx = await getContext();
    const pages = ctx.pages().filter((p) => isChatgptUrl(p.url()));
    page = pages[pages.length - 1] || (await openPage(`${config.baseUrl}/`));
  }
  return op(page, 'inspect');
}

export function jobs({ limit = 20 } = {}) {
  return listJobs(limit);
}

export async function isBrowserRunning() {
  return browserRunning();
}
