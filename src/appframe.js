import { config } from './config.js';

// Deep research (2026) runs as an "MCP app" rendered in a cross-origin sandbox
// iframe (web-sandbox.oaiusercontent.com) that holds a same-origin about:blank
// child with the actual UI. Playwright cannot see into it over connectOverCDP,
// so we talk to the iframe's CDP target directly.

const initIdOf = (url) => (String(url).match(/[#&?]initId=([^&]+)/) || [])[1] || null;

async function evaluateInTarget(target, expression, timeoutMs = 15_000) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  try {
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP websocket error')), { once: true });
    });
    const reply = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP evaluate timed out')), timeoutMs);
      ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id !== 1) return;
        clearTimeout(timer);
        resolve(msg);
      });
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    });
    if (reply.error) throw new Error(reply.error.message);
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.text);
    return reply.result?.result?.value;
  } finally {
    ws.close();
  }
}

/** CDP targets of the app iframes embedded in this page (matched by initId). */
export async function appTargets(page, frameSrcPart) {
  const srcs = await page.evaluate(
    (part) => [...document.querySelectorAll('iframe')].map((f) => f.src).filter((s) => s.includes(part)),
    frameSrcPart,
  );
  if (!srcs.length) return [];
  const list = await (await fetch(`http://127.0.0.1:${config.port}/json/list`)).json();
  const frames = list.filter((t) => t.type === 'iframe' && t.url.includes(frameSrcPart));
  return srcs
    .map((src) => frames.find((t) => initIdOf(t.url) && initIdOf(t.url) === initIdOf(src)) || frames.find((t) => t.url === src))
    .filter(Boolean);
}

/** Run fn(arg) inside the innermost document of each app iframe and return the results. */
export async function evalInApps(page, frameSrcPart, fn, arg) {
  const targets = await appTargets(page, frameSrcPart);
  const expression = `(() => {
    const docs = [document];
    document.querySelectorAll('iframe').forEach((f) => { try { if (f.contentDocument?.body) docs.push(f.contentDocument); } catch {} });
    const doc = docs[docs.length - 1];
    return JSON.stringify((${fn.toString()})(doc, ${JSON.stringify(arg ?? null)}));
  })()`;
  const out = [];
  for (const t of targets) {
    const raw = await evaluateInTarget(t, expression).catch(() => null);
    if (raw) out.push(JSON.parse(raw));
  }
  return out;
}
