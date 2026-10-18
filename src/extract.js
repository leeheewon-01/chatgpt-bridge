import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  linkStyle: 'inlined',
});
td.use(gfm);

td.addRule('math', {
  filter: (node) => node.getAttribute && node.getAttribute('data-cgb-math'),
  replacement: (content, node) =>
    node.getAttribute('data-cgb-math') === 'display' ? `\n\n$$\n${node.textContent}\n$$\n\n` : `$${node.textContent}$`,
});

td.addRule('fencedCode', {
  filter: (node) => node.nodeName === 'PRE',
  replacement: (content, node) => {
    const code = node.querySelector('code') || node;
    const lang = ((code.getAttribute('class') || '').match(/language-([\w+#-]+)/) || [])[1] || '';
    const text = code.textContent.replace(/\n$/, '');
    const fence = text.includes('```') ? '~~~~' : '```';
    return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
  },
});

export function htmlToMarkdown(html) {
  return td
    .turndown(html || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
