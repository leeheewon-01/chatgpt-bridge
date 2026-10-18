// A small stand-in for chatgpt.com that mirrors the DOM observed on the real
// site (Oct 2026): contenteditable composer, "보내기"/"중지" buttons, the + menu
// with an app-mention Deep research token, the model menu's power slider and
// version list, search-unit-keyed messages, an action bar whose copy button
// writes Markdown through navigator.clipboard, local→server conversation ids,
// and Deep research as a cross-site app iframe exposing window.openai.widgetState.
import http from 'node:http';

const LEVELS = ['Instant', 'Medium', 'High', 'Extra High', 'Pro'];

const PAGE = (transcript, loggedOut) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>ChatGPT</title>
<style>[hidden]{display:none!important} [role=slider]{display:inline-block;width:80px;height:8px;background:#ccc}</style></head>
<body>
<header>
  ${loggedOut ? '<button type="button">로그인</button>' : ''}
</header>
<main data-app-shell-main-surface="browser"><div id="thread">${transcript}</div>
<form>
  <input type="file" aria-label="사진 첨부" accept="image/*" multiple hidden>
  <input type="file" aria-label="파일 첨부" id="upload" multiple hidden>
  <div id="chips"></div>
  <button type="button" aria-label="파일 등 추가" id="plus">+</button>
  <div id="plus-menu" hidden>
    <button type="button" id="add-files">사진 및 파일 추가 컴퓨터에서 업로드</button>
    <button type="button" id="dr">심층 리서치 상세 보고서 받기</button>
  </div>
  <div contenteditable="true" role="textbox" data-composer-markdown="" aria-label="ChatGPT에게 물어보세요" id="box"></div>
  <button type="button" aria-label="ChatGPT 모델 선택" id="model">Pro</button>
  <div role="menu" id="model-menu" hidden>
    <div role="menuitem" aria-label="모델 선택" id="model-name">6 Pro</div>
    <div role="menuitem" aria-label="파워"><span role="slider" tabindex="-1" aria-valuemin="0" aria-valuemax="4" aria-valuenow="4" id="slider"></span></div>
    <span role="status" id="power-status">Pro, 5개 중 5번째.</span>
    <div role="menuitemradio" aria-checked="true">Latest</div>
    <div role="menuitemradio" aria-checked="false">GPT-5.6 Sol</div>
  </div>
  <button type="submit" aria-label="보내기" id="send" disabled>↑</button>
  <button type="button" aria-label="중지" id="stop" hidden>■</button>
</form></main>
<script>
const LEVELS = ${JSON.stringify(LEVELS)};
let uploading = false, files = [];
let turn = document.querySelectorAll('[data-chatgpt-search-unit-key$=":user"]').length;
const $ = (s) => document.querySelector(s);
const box = $('#box'), send = $('#send'), stop = $('#stop');
const hasToken = () => !!box.querySelector('[app-mention-path]');
const promptText = () => [...box.childNodes].filter((n) => !(n.nodeType === 1 && n.hasAttribute('app-mention-path'))).map((n) => n.textContent).join('').trim();
const refresh = () => { send.disabled = !promptText() || uploading; };
box.addEventListener('input', refresh);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('#model-menu').hidden = true; $('#plus-menu').hidden = true; }
});

// Model menu: power slider driven by the keyboard, plus a version list.
function setLevel(i) {
  i = Math.max(0, Math.min(4, i));
  $('#slider').setAttribute('aria-valuenow', i);
  $('#power-status').textContent = LEVELS[i] + ', 5개 중 ' + (i + 1) + '번째.';
  $('#model-name').textContent = i === 4 ? '6 Pro' : LEVELS[i];
  $('#model').textContent = LEVELS[i];
}
$('#model').onclick = () => { $('#model-menu').hidden = false; };
$('#slider').addEventListener('keydown', (e) => {
  const now = Number($('#slider').getAttribute('aria-valuenow'));
  if (e.key === 'Home') setLevel(0);
  if (e.key === 'End') setLevel(4);
  if (e.key === 'ArrowRight') setLevel(now + 1);
  if (e.key === 'ArrowLeft') setLevel(now - 1);
});
document.querySelectorAll('[role=menuitemradio]').forEach((r) => (r.onclick = () => {
  document.querySelectorAll('[role=menuitemradio]').forEach((o) => o.setAttribute('aria-checked', String(o === r)));
}));

// + menu: files and the Deep research app mention.
$('#plus').onclick = () => { $('#plus-menu').hidden = false; };
$('#add-files').onclick = () => { $('#plus-menu').hidden = true; $('#upload').click(); };
$('#dr').onclick = () => {
  $('#plus-menu').hidden = true;
  box.innerHTML = '<span app-mention-path="app://connector_openai_deep_research" contenteditable="false"><span>심층 리서치</span></span>&nbsp;';
  refresh();
};
$('#upload').onchange = (e) => {
  uploading = true; refresh();
  const bar = document.createElement('div'); bar.setAttribute('role', 'progressbar'); $('#chips').appendChild(bar);
  setTimeout(() => {
    bar.remove();
    for (const f of e.target.files) { files.push(f.name); const c = document.createElement('div'); c.textContent = f.name; $('#chips').appendChild(c); }
    uploading = false; refresh();
  }, 800);
};

const CODE_BLOCK = '<div data-markdown-copy="code-block"><div data-markdown-copy="exclude"><div>Python</div><button type="button" aria-label="복사">c</button><button type="button" aria-label="코드 실행">실행</button></div>'
  + '<div role="textbox" contenteditable="true" data-language="python"><div>print("hi")</div><div>x = 1</div></div></div>';
const RICH_HTML = '<h2>Answer</h2><p>Plain <strong>bold</strong> with a <a href="https://example.com/src?utm_source=chatgpt.com">source</a>.</p>' + CODE_BLOCK
  + '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
const RICH_MD = '## Answer\\n\\nPlain **bold** with a [source](https://example.com/src?utm_source=chatgpt.com).\\n\\n\`\`\`python\\nprint("hi")\\nx = 1\\n\`\`\`\\n\\n| a | b |\\n|---|---|\\n| 1 | 2 |';

function addTurn(n, userText) {
  const t = document.createElement('div');
  t.setAttribute('data-content-search-turn-key', 'turn-' + n);
  t.innerHTML = '<div data-chatgpt-search-unit-key="turn-' + n + ':0:user"><div data-user-message-bubble="true">' + userText + '</div><button type="button" aria-label="메시지 복사">c</button></div>'
    + '<div><div data-chatgpt-search-unit-key="turn-' + n + ':1:assistant"><div data-markdown-text-style="assistant-message"><p>…</p></div></div></div>';
  $('#thread').appendChild(t);
  return { turnEl: t, body: t.querySelector('[data-markdown-text-style]') };
}
function finish(turnEl, md) {
  const bar = document.createElement('div');
  bar.innerHTML = '<button type="button" aria-label="복사">c</button><button type="button" aria-label="공유">s</button>';
  bar.firstChild.onclick = () => { if (md) navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([md], { type: 'text/plain' }) })]); };
  turnEl.appendChild(bar);
  stop.hidden = true; send.hidden = false;
  const id = location.pathname.split('/c/')[1];
  if (id) fetch('/save', { method: 'POST', body: JSON.stringify({ id: decodeURIComponent(id), html: $('#thread').innerHTML }) });
}
send.onclick = () => {
  const deepResearch = hasToken();
  const text = promptText();
  box.innerHTML = ''; refresh(); turn++;
  $('#chips').innerHTML = '';
  if (!location.pathname.startsWith('/c/')) {
    history.pushState({}, '', '/c/' + encodeURIComponent('local-chatgpt:' + crypto.randomUUID()));
    setTimeout(() => {
      const serverId = crypto.randomUUID();
      history.replaceState({}, '', '/c/' + serverId);
      fetch('/save', { method: 'POST', body: JSON.stringify({ id: serverId, html: $('#thread').innerHTML }) });
    }, 1200);
  }
  const { turnEl, body } = addTurn(turn, text.replace(/</g, '&lt;') + (files.length ? ' [' + files.join(', ') + ']' : ''));
  files = [];
  stop.hidden = false; send.hidden = true;
  if (deepResearch) {
    // Like the real site: a short chat message that is "done" immediately, plus
    // a cross-site app iframe (OOPIF) whose window.openai.widgetState is the truth.
    setTimeout(() => {
      body.innerHTML = '<p>심층 리서치를 시작했습니다. 최종 보고서를 Deep Research 화면에 업데이트합니다.</p>';
      const frame = document.createElement('iframe');
      frame.setAttribute('data-mcp-app-frame', 'true');
      frame.src = 'http://localhost:' + location.port + '/__fake_dr_app?start=' + Date.now() + '#initId=' + crypto.randomUUID();
      turnEl.appendChild(frame);
      finish(turnEl, '심층 리서치를 시작했습니다.');
    }, 500);
  } else {
    let n = 0;
    const t = setInterval(() => { body.innerHTML = '<p>' + 'word '.repeat(++n) + '</p>' + (n > 3 ? CODE_BLOCK : ''); }, 200);
    setTimeout(() => { clearInterval(t); body.innerHTML = RICH_HTML; finish(turnEl, /NOCOPY/.test(text) ? null : RICH_MD); }, 2500);
  }
};
</script></body></html>`;

const DR_APP = `<!doctype html><html><head><meta charset="utf-8"><title>sandbox</title></head><body><div id="ui"></div><script>
const start = Number(new URLSearchParams(location.search).get('start'));
const plan = { plan_id: 'p1', title: 'EV battery research', steps: [{ id: 's1', text: 'Search sources', status: 'pending' }, { id: 's2', text: 'Write report', status: 'pending' }] };
const C1 = '\\ue200cite\\ue202turn1view0\\ue202turn2view0\\ue201';
const C2 = '\\ue200cite\\ue202turn3view0\\ue201';
const REPORT = '# Report\\n\\nClaim one. ' + C1 + '\\n\\n| a | b |\\n|---|---|\\n| 1 | 2 |\\n\\nClaim two. ' + C2 + ' ';
const REFS = [
  { matched_text: C1, type: 'grouped_webpages', items: [{ title: 'Source A', url: 'https://a.example/x?utm_source=chatgpt.com', supporting_websites: [{ title: 'Source B', url: 'https://b.example/' }] }], safe_urls: ['https://a.example/x', 'https://c.example/'] },
  { matched_text: C2, type: 'grouped_webpages', items: [{ title: 'Source A', url: 'https://a.example/x' }], safe_urls: [] },
  { matched_text: ' ', type: 'sources_footnote', items: [], safe_urls: [] },
];
const PLAN_MS = 5000;
const DONE_MS = 8000;
function state() {
  // Long enough phases that a slow CI machine still sees each one.
  const t = Date.now() - start;
  if (t < PLAN_MS) return { plan, status: 'waiting_for_user_response_on_plan', waiting_for_user_response_on_plan_until: new Date(start + PLAN_MS).toISOString() };
  if (t < DONE_MS) return { plan, status: 'in_progress', research_started_at: new Date(start + PLAN_MS).toISOString() };
  return { plan, status: 'completed', research_started_at: new Date(start + PLAN_MS).toISOString(), research_stopped_at: new Date(start + DONE_MS).toISOString(),
    report_message: { status: 'finished_successfully', content: { content_type: 'text', parts: [REPORT] }, metadata: { content_references: REFS } } };
}
window.openai = { get widgetState() { return state(); }, toolResponseMetadata: { websocket_url: 'wss://secret.invalid' } };
setInterval(() => { document.getElementById('ui').textContent = state().status; }, 300);
</script></body></html>`;

export function startFakeChatgpt() {
  const conversations = new Map();
  let loggedOut = false;
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/save') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const { id, html } = JSON.parse(body);
        conversations.set(id, html);
        res.end('ok');
      });
      return;
    }
    if (req.url.startsWith('/__fake_dr_app')) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.end(DR_APP);
    }
    const m = req.url.match(/^\/c\/([^/?#]+)/);
    const id = m ? decodeURIComponent(m[1]) : null;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(PAGE(id ? conversations.get(id) || '' : '', loggedOut));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => server.close(),
        setLoggedOut: (v) => (loggedOut = v),
      });
    });
  });
}
