// Runs inside the ChatGPT page via page.evaluate(pageOp, {...}). It must stay
// self-contained: no imports, no closures over module scope.
export function pageOp({ op, sel, arg = {} }) {
  const DEFAULT_CSS = "button, [role='button'], [role='menuitem'], [role='menuitemradio'], [role='option'], a";

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    if (!el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) !== 0;
  };
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const labelsOf = (el) =>
    [el.getAttribute('aria-label'), el.getAttribute('title'), norm(el.innerText || el.textContent)].filter(Boolean);
  const disabled = (el) => el.disabled || el.getAttribute('aria-disabled') === 'true';

  function findAll(key, root = document) {
    for (const c of sel[key] || []) {
      const o = typeof c === 'string' ? { css: c } : c;
      let els;
      try {
        els = [...root.querySelectorAll(o.css || DEFAULT_CSS)];
      } catch {
        continue;
      }
      if (o.label) {
        const re = new RegExp(o.label, 'i');
        els = els.filter((e) => labelsOf(e).some((t) => re.test(norm(t))));
      }
      if (!o.hidden) els = els.filter(visible);
      if (els.length) return els;
    }
    return [];
  }
  const first = (key, root) => findAll(key, root)[0] || null;
  const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  function conversation() {
    const users = findAll('userMessage');
    const assistants = findAll('assistantMessage');
    const lastUser = users[users.length - 1] || null;
    const replies = lastUser ? assistants.filter((a) => after(lastUser, a)) : assistants;
    return { users, assistants, lastUser, replies, last: replies[replies.length - 1] || null };
  }

  // The copy/like action bar appears only once a reply is final. It is rendered
  // after the message element, not inside it (code blocks inside the reply have
  // their own copy buttons that show up while streaming).
  function replyHasCopy(msg) {
    return findAll('copyButton').some((c) => after(msg, c) && !msg.contains(c));
  }

  function cleanClone(el) {
    const clone = el.cloneNode(true);
    // KaTeX: keep the TeX source, drop the rendered glyphs.
    clone.querySelectorAll('.katex').forEach((k) => {
      const tex = k.querySelector('annotation[encoding="application/x-tex"]');
      if (!tex) return;
      const display = !!k.closest('.katex-display');
      const span = document.createElement(display ? 'div' : 'span');
      span.setAttribute('data-cgb-math', display ? 'display' : 'inline');
      span.textContent = tex.textContent;
      (display ? k.closest('.katex-display') : k).replaceWith(span);
    });
    // 2026 code blocks are an editor widget: one div per line, language on [data-language].
    clone.querySelectorAll('[data-markdown-copy="code-block"]').forEach((block) => {
      const editor = block.querySelector('[data-language]');
      const lines = editor ? [...editor.children].map((l) => l.textContent) : [block.textContent];
      const pre = document.createElement('pre');
      const c = document.createElement('code');
      const lang = editor?.getAttribute('data-language');
      if (lang) c.className = `language-${lang}`;
      c.textContent = lines.join('\n');
      pre.appendChild(c);
      block.replaceWith(pre);
    });
    clone.querySelectorAll('[data-markdown-copy="exclude"]').forEach((n) => n.remove());
    // Older markup: <pre><code class="language-x">.
    clone.querySelectorAll('pre:not(:has(> code[class^="language-"]))').forEach((pre) => {
      const code = pre.querySelector('code');
      const lang = (code?.className.match(/language-([\w+#-]+)/) || [])[1] || '';
      const fresh = document.createElement('pre');
      const c = document.createElement('code');
      if (lang) c.className = `language-${lang}`;
      c.textContent = (code || pre).innerText ?? (code || pre).textContent;
      fresh.appendChild(c);
      pre.replaceWith(fresh);
    });
    if (sel.stripFromContent) clone.querySelectorAll(sel.stripFromContent).forEach((n) => n.remove());
    return clone;
  }

  if (op === 'snapshot') {
    const { replies, last, users, assistants } = conversation();
    const lastText = last ? last.innerText || '' : '';
    const head = `${document.title}\n${(document.body?.innerText || '').slice(0, 600)}`;
    return {
      url: location.href,
      title: document.title,
      challenge: new RegExp(sel.challengePattern, 'i').test(head) || !!document.querySelector('iframe[src*="challenges.cloudflare.com"]'),
      loginVisible: !!first('loginButton'),
      composerVisible: !!first('composer'),
      stopVisible: !!first('stopButton'),
      busyVisible: !!first('busyIndicator'),
      userCount: users.length,
      assistantCount: assistants.length,
      replyCount: replies.length,
      lastLen: lastText.length,
      lastTail: lastText.slice(-1500),
      lastHead: lastText.slice(0, 600),
      copyInLastTurn: last ? replyHasCopy(last) : false,
      errorInLast: last ? new RegExp(sel.errorPattern, 'i').test(lastText.slice(-400)) : false,
      iframeInLast: last ? !!last.querySelector('iframe') : false,
    };
  }

  if (op === 'mark') {
    // Tag an element so Playwright can click it with real input events.
    const root = arg.within ? document.querySelector(`[data-cgb="${arg.within}"]`) || document : document;
    let el;
    if (arg.label) {
      const re = new RegExp(arg.label, 'i');
      const pool = findAll(arg.key, root).filter((e) => labelsOf(e).some((t) => re.test(norm(t))));
      pool.sort((a, b) => norm(a.innerText).length - norm(b.innerText).length);
      el = pool[0];
    } else {
      el = first(arg.key, root);
    }
    if (!el) return { found: false };
    el.setAttribute('data-cgb', arg.nonce);
    return { found: true, label: labelsOf(el)[0] || '', text: norm(el.innerText), disabled: disabled(el), tag: el.tagName.toLowerCase(), editable: el.isContentEditable };
  }

  if (op === 'markReplyCopies') {
    // For each reply, the action-bar copy button that follows it (before the next reply).
    const { replies, assistants } = conversation();
    const msgs = arg.all ? assistants : replies;
    const copies = findAll('copyButton');
    let marked = 0;
    msgs.forEach((m, i) => {
      const next = msgs[i + 1];
      const c = copies.find((b) => after(m, b) && !m.contains(b) && (!next || after(b, next)));
      if (c) {
        c.setAttribute('data-cgb', `${arg.nonce}-${marked}`);
        marked++;
      }
    });
    return { marked, messages: msgs.length };
  }

  if (op === 'powerState') {
    // Status reads like "Pro, 5개 중 5번째." / "Pro, 5 of 5": the level name comes first.
    const status = norm(first('powerStatus')?.innerText);
    const slider = first('powerSlider');
    return {
      level: status.split(',')[0].trim(),
      status,
      now: Number(slider?.getAttribute('aria-valuenow') ?? -1),
      max: Number(slider?.getAttribute('aria-valuemax') ?? -1),
    };
  }

  if (op === 'listLabels') {
    return findAll(arg.key).map((e) => norm(labelsOf(e)[0] || '')).filter(Boolean);
  }

  if (op === 'composerText') {
    const c = first('composer');
    if (!c) return null;
    return c.value !== undefined && c.tagName === 'TEXTAREA' ? c.value : c.innerText;
  }

  if (op === 'sendState') {
    const b = first('sendButton');
    return { found: !!b, disabled: b ? disabled(b) : true, busy: !!document.querySelector('[aria-busy="true"], [role="progressbar"]') };
  }

  if (op === 'composerArea') {
    // Text near the composer, used to confirm attachment chips show file names.
    const c = first('composer');
    const form = c?.closest('form') || c?.parentElement?.parentElement?.parentElement;
    return norm(form?.innerText || '') + ' ' + [...(form?.querySelectorAll('[aria-label],[title]') || [])].map((e) => e.getAttribute('aria-label') || e.getAttribute('title')).join(' ');
  }

  if (op === 'extract') {
    const { replies, assistants } = conversation();
    const msgs = arg.all ? assistants : replies;
    const parts = msgs.map((m) => {
      const contents = findAll('messageContent', m);
      const blocks = contents.length ? contents.filter((c) => !contents.some((o) => o !== c && o.contains(c))) : [m];
      return blocks.map((b) => cleanClone(b).innerHTML).join('\n');
    });
    return {
      html: parts.join('\n<hr>\n'),
      text: msgs.map((m) => m.innerText).join('\n\n---\n\n'),
      count: msgs.length,
      iframes: msgs.flatMap((m) => [...m.querySelectorAll('iframe')].map((f) => f.src || '(inline)')),
    };
  }

  if (op === 'inspect') {
    const describe = (el) => {
      const o = { tag: el.tagName.toLowerCase() };
      for (const a of ['id', 'role', 'aria-label', 'data-testid', 'type', 'accept', 'title']) {
        const v = el.getAttribute(a);
        if (v) o[a] = v.slice(0, 80);
      }
      const t = norm(el.innerText).slice(0, 40);
      if (t) o.text = t;
      if (!visible(el)) o.hidden = true;
      return o;
    };
    const dataAttrs = {};
    document.querySelectorAll('*').forEach((e) => {
      for (const a of e.attributes) if (a.name.startsWith('data-') && /role|author|turn|message|testid|state|stream/.test(a.name)) {
        const key = `${a.name}=${a.value.slice(0, 40)}`;
        dataAttrs[key] = (dataAttrs[key] || 0) + 1;
      }
    });
    const keys = Object.keys(sel).filter((k) => Array.isArray(sel[k]));
    const matches = {};
    for (const k of keys) {
      const found = findAll(k);
      matches[k] = found.length ? `${found.length} match(es): ${JSON.stringify(describe(found[0]))}` : 'NO MATCH';
    }
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id) => !/^(radix|:r|_r_|«)/.test(id));
    const buttons = [...document.querySelectorAll("button, [role='button'], [role='menuitem'], [role='option']")]
      .filter(visible)
      .map(describe)
      .slice(0, 120);
    const transcriptRoot = first('transcript');
    let sample = null;
    if (transcriptRoot) {
      // Outline of the transcript, two levels deep, to spot message containers.
      const walk = (el, depth) =>
        depth > 4
          ? undefined
          : [...el.children].slice(0, 12).map((c) => ({ ...describe(c), children: walk(c, depth + 1) }));
      sample = walk(transcriptRoot, 0);
    }
    return {
      url: location.href,
      title: document.title,
      matches,
      ids: [...new Set(ids)].slice(0, 200),
      dataAttrs,
      fileInputs: [...document.querySelectorAll('input[type=file]')].map(describe),
      buttons,
      transcript: sample,
    };
  }

  throw new Error(`unknown op ${op}`);
}
