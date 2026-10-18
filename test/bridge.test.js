// End-to-end test against a local fake ChatGPT, in a headless throwaway Chrome.
// Never touches chatgpt.com or the real bridge profile.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startFakeChatgpt } from './fake-chatgpt.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cgb-test-'));
let fake;
let bridge;

before(async () => {
  fake = await startFakeChatgpt();
  process.env.CHATGPT_BRIDGE_HOME = tmp;
  process.env.CHATGPT_BRIDGE_PORT = String(9400 + Math.floor(Math.random() * 500));
  process.env.CHATGPT_BRIDGE_BASE_URL = fake.url;
  process.env.CHATGPT_BRIDGE_HEADLESS = '1';
  // Real selectors, plus the fake Deep research app's iframe URL.
  const sel = JSON.parse(fs.readFileSync(new URL('../selectors.json', import.meta.url), 'utf8'));
  sel.deepResearchAppFrame = [...sel.deepResearchAppFrame, '/__fake_dr_app'];
  process.env.CHATGPT_BRIDGE_SELECTORS = path.join(tmp, 'test-selectors.json');
  fs.writeFileSync(process.env.CHATGPT_BRIDGE_SELECTORS, JSON.stringify(sel));
  bridge = await import('../src/bridge.js');
});

after(async () => {
  try {
    const b = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CHATGPT_BRIDGE_PORT}`);
    const s = await b.newBrowserCDPSession();
    await s.send('Browser.close').catch(() => {});
  } catch {}
  fake.close();
  // Chrome keeps flushing its profile for a moment after Browser.close; wait for it to go away.
  for (let i = 0; i < 40; i++) {
    const alive = await fetch(`http://127.0.0.1:${process.env.CHATGPT_BRIDGE_PORT}/json/version`)
      .then(() => true)
      .catch(() => false);
    if (!alive) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  try {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 });
  } catch (err) {
    // A leftover temp dir is harmless; don't fail the suite over it.
    console.error(`could not remove ${tmp}: ${err.message}`);
  }
  setTimeout(() => process.exit(), 100);
});

test('session reports ready', async () => {
  const s = await bridge.session();
  assert.equal(s.state, 'ready');
  assert.equal(s.logged_in, true);
});

test('power level + file: submit, wait, fetch via copy button, reopen', async () => {
  const file = path.join(tmp, 'notes.txt');
  fs.writeFileSync(file, 'hello');
  const sub = await bridge.submit({ prompt: 'Explain this\nfile please', files: [file], mode: 'high' });
  // The provisional "local-chatgpt:…" id must have been replaced by the server id.
  assert.match(sub.job_id, /^[0-9a-f-]{36}$/);
  assert.equal(sub.active_model, 'High');

  const early = await bridge.status({ jobId: sub.job_id });
  assert.ok(['generating', 'waiting'].includes(early.state), early.state);

  const done = await bridge.wait({ jobId: sub.job_id, timeoutSec: 20, intervalSec: 1 });
  assert.equal(done.state, 'completed');

  const out = path.join(tmp, 'out', 'answer.md');
  const res = await bridge.fetchResult({ jobId: sub.job_id, outPath: out, closeTab: true });
  assert.equal(res.extracted_via, 'copy');
  const md = fs.readFileSync(out, 'utf8');
  assert.equal(res.path, out);
  assert.match(md, /^source: .*\/c\//m);
  assert.match(md, /^## Answer$/m);
  assert.match(md, /\[source\]\(https:\/\/example\.com\/src\)/);
  assert.match(md, /```python\nprint\("hi"\)\nx = 1\n```/);
  assert.match(md, /\| a \| b \|/);

  // Tab was closed; status must reopen the conversation from its URL.
  const again = await bridge.status({ jobId: sub.job_id });
  assert.equal(again.state, 'completed');
  assert.equal(bridge.jobs().length, 1);
});

test('reply in the same conversation; DOM fallback when copy fails', async () => {
  const [job] = bridge.jobs();
  await bridge.reply({ jobId: job.id, text: 'More detail please NOCOPY' });
  const done = await bridge.wait({ jobId: job.id, timeoutSec: 20, intervalSec: 1 });
  assert.equal(done.state, 'completed');
  const res = await bridge.fetchResult({ jobId: job.id });
  assert.equal(res.extracted_via, 'dom');
  assert.equal(res.messages, 1);
  assert.match(res.markdown, /```python\nprint\("hi"\)\nx = 1\n```/);
  assert.doesNotMatch(res.markdown, /실행|utm_source/);
});

test('deep research: app widget drives state; report with resolved citations', async () => {
  const sub = await bridge.submit({ prompt: 'Research EV batteries', mode: 'deep_research' });
  assert.equal(sub.deep_research_verified, true);

  // The chat message is finished at once, but the plan is still counting down.
  await new Promise((r) => setTimeout(r, 800));
  const plan = await bridge.status({ jobId: sub.job_id });
  assert.equal(plan.state, 'generating');
  assert.equal(plan.deep_research.phase, 'plan');
  assert.equal(plan.deep_research.title, 'EV battery research');

  const done = await bridge.wait({ jobId: sub.job_id, timeoutSec: 20, intervalSec: 1 });
  assert.equal(done.state, 'completed');
  assert.equal(done.deep_research.phase, 'completed');

  const res = await bridge.fetchResult({ jobId: sub.job_id, closeTab: true });
  assert.equal(res.extracted_via, 'deep_research');
  const md = res.markdown;
  assert.match(md, /^# Report$/m);
  assert.match(md, /Claim one\.  ?\[1\]\(https:\/\/a\.example\/x\) \[2\]\(https:\/\/b\.example\/\) \[3\]\(https:\/\/c\.example\/\)/);
  assert.match(md, /Claim two\.  ?\[1\]\(https:\/\/a\.example\/x\)/);
  assert.match(md, /\| a \| b \|/);
  assert.match(md, /## Sources\n\n1\. \[Source A\]\(https:\/\/a\.example\/x\)\n2\. \[Source B\]/);
  assert.doesNotMatch(md, /[\ue200-\ue2ff]|utm_source|secret/);

  // Reopened from its URL, the widget state is read again.
  const again = await bridge.status({ jobId: sub.job_id });
  assert.equal(again.state, 'completed');
});

test('logged out is reported, not worked around', async () => {
  fake.setLoggedOut(true);
  try {
    await assert.rejects(bridge.submit({ prompt: 'hi' }), (err) => err.code === 'needs_login');
  } finally {
    fake.setLoggedOut(false);
  }
});

test('unknown model version lists what the menu offers', async () => {
  await assert.rejects(bridge.submit({ prompt: 'hi', modelVersion: 'GPT-9' }), (err) => {
    assert.equal(err.code, 'model');
    assert.match(err.message, /GPT-5\.6 Sol/);
    return true;
  });
});

test('~/.chatgpt-bridge/selectors.json overrides bundled keys', async () => {
  const { loadSelectors, config } = await import('../src/config.js');
  const before = loadSelectors();
  fs.writeFileSync(config.selectorsOverride, JSON.stringify({ errorPattern: 'override-works' }));
  try {
    const sel = loadSelectors();
    assert.equal(sel.errorPattern, 'override-works');
    assert.deepEqual(sel.composer, before.composer);
  } finally {
    fs.rmSync(config.selectorsOverride);
  }
  assert.equal(loadSelectors().errorPattern, before.errorPattern);
});
