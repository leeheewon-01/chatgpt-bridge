import { evalInApps } from './appframe.js';

// Deep research keeps its whole state in the app's window.openai.widgetState:
// plan, status ("waiting_for_user_response_on_plan" → … → "completed"), timing,
// and report_message (Markdown with private-use citation tokens resolved by
// metadata.content_references). Only these fields are read; tokens and
// websocket URLs elsewhere in window.openai are never touched.

function readWidget(doc) {
  const ws = doc.defaultView.openai?.widgetState;
  if (!ws || !(ws.plan || ws.report_message)) return null;
  const statuses = (ws.plan && ws.step_statuses_by_plan?.[ws.plan.plan_id]) || {};
  const report = ws.report_message;
  return {
    status: ws.status || null,
    title: ws.plan?.title || null,
    steps: (ws.plan?.steps || []).map((s) => ({ text: s.text, status: statuses[s.id] || s.status || null })),
    planAutoStartAt: ws.waiting_for_user_response_on_plan_until || null,
    startedAt: ws.research_started_at || null,
    stoppedAt: ws.research_stopped_at || null,
    reportStatus: report?.status || null,
    report: report
      ? {
          text: (report.content?.parts || []).filter((p) => typeof p === 'string').join('\n'),
          refs: (report.metadata?.content_references || []).map((r) => ({
            matched: r.matched_text,
            type: r.type,
            items: (r.items || []).flatMap((i) => [i, ...(i.supporting_websites || [])]).map((i) => ({ title: i.title, url: i.url })),
            urls: r.safe_urls || [],
          })),
        }
      : null,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Latest Deep research widget in the page, or null. Retries while a freshly opened tab boots the app. */
export async function deepResearchWidget(page, frameSrcParts, { waitMs = 0 } = {}) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    for (const part of frameSrcParts) {
      const found = (await evalInApps(page, part, readWidget).catch(() => [])).filter(Boolean);
      if (found.length) return found[found.length - 1];
    }
    if (Date.now() >= deadline) return null;
    await sleep(1_000);
  }
}

export function widgetState(w) {
  const s = String(w.status || '').toLowerCase();
  if (s === 'completed' && w.report?.text) return 'completed';
  if (/fail|error/.test(s)) return 'error';
  if (/cancel|stop|abort/.test(s)) return 'error';
  return 'generating';
}

export function widgetPhase(w) {
  const s = String(w.status || '');
  if (/waiting_for_user_response_on_plan/.test(s)) return 'plan';
  return s || 'unknown';
}

/** Remove ChatGPT's private-use citation tokens (U+E200 "cite" U+E202 "turn3view0" U+E201). */
export const stripCitations = (text) => text.replace(/\ue200[^\ue201]*\ue201/g, '').replace(/[\ue200-\ue2ff]/g, '');

const stripUtm = (u) => u.replace(/([?&])utm_source=chatgpt\.com(&?)/g, (m, sep, tail) => (tail ? sep : ''));

/** Report Markdown with citation tokens replaced by numbered links and a Sources list. */
export function reportMarkdown(report) {
  const numbers = new Map();
  const sources = [];
  const numberFor = (url, title) => {
    const clean = stripUtm(url);
    if (!numbers.has(clean)) {
      numbers.set(clean, numbers.size + 1);
      sources.push({ n: numbers.size, url: clean, title: title || clean });
    }
    return numbers.get(clean);
  };
  let text = report.text;
  for (const ref of report.refs) {
    // Only real citation tokens; e.g. the sources_footnote entry matches a bare space.
    if (!ref.matched || !/[\ue200-\ue2ff]/.test(ref.matched)) continue;
    // items carry titles; safe_urls may list more sources of the same group.
    const seen = new Set();
    const links = [...ref.items, ...ref.urls.map((url) => ({ url, title: null }))]
      .filter((i) => i.url && !seen.has(stripUtm(i.url)) && seen.add(stripUtm(i.url)))
      .map((i) => `[${numberFor(i.url, i.title)}](${stripUtm(i.url)})`);
    text = text.split(ref.matched).join(links.length ? ` ${links.join(' ')}` : '');
  }
  // Any citation-like token left without a reference.
  text = stripUtm(stripCitations(text)).trim();
  if (sources.length) {
    text += `\n\n## Sources\n\n${sources.map((s) => `${s.n}. [${s.title.replace(/[[\]]/g, '')}](${s.url})`).join('\n')}`;
  }
  return text;
}
