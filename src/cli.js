#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { execFile } from 'node:child_process';
import * as bridge from './bridge.js';

const USAGE = `chatgpt-bridge <command> [options]

  session                         Start the bridge Chrome and report login state
  login                           Bring the ChatGPT window forward to sign in by hand
  submit [prompt]                 Send a prompt (or --prompt-file / stdin) and print the job
      --mode default|instant|medium|high|extra_high|pro|deep_research
      --version <regex>  --file <path> (repeatable)
  status <job>                    One status check
  wait <job> [--timeout 3600] [--out path] [--notify]
                                  Block until done (good for background shells); with --out also fetch
  fetch <job> [--out path] [--all] [--close] [--force]
  reply <job> [text] [--file <path>]
  jobs [--limit 20]
  close <job>
  inspect [job]                   Dump selector matches and page structure (for fixing selectors.json)
`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: 'string' },
    version: { type: 'string' },
    file: { type: 'string', multiple: true },
    'prompt-file': { type: 'string' },
    timeout: { type: 'string' },
    out: { type: 'string' },
    notify: { type: 'boolean' },
    all: { type: 'boolean' },
    close: { type: 'boolean' },
    force: { type: 'boolean' },
    limit: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [cmd, ...rest] = positionals;
const print = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));

async function readText(arg) {
  if (opt['prompt-file']) return fs.readFileSync(opt['prompt-file'], 'utf8');
  if (arg) return arg;
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data;
  }
  throw new Error('No text given: pass it as an argument, --prompt-file, or stdin.');
}

function notify(title, message) {
  if (process.platform === 'darwin') {
    const esc = (s) => String(s).replace(/["\\]/g, '\\$&');
    execFile('osascript', ['-e', `display notification "${esc(message)}" with title "${esc(title)}"`], () => {});
  } else if (process.platform === 'linux') {
    execFile('notify-send', [title, message], () => {});
  }
}

async function main() {
  switch (cmd) {
    case 'session':
      return print(await bridge.session());
    case 'login':
      return print(await bridge.login());
    case 'submit':
      return print(
        await bridge.submit({
          prompt: await readText(rest.join(' ')),
          files: opt.file,
          mode: opt.mode,
          modelVersion: opt.version,
        }),
      );
    case 'status':
      return print(await bridge.status({ jobId: rest[0] }));
    case 'wait': {
      const timeoutSec = Number(opt.timeout || 3600);
      let st;
      const deadline = Date.now() + timeoutSec * 1000;
      do {
        st = await bridge.wait({ jobId: rest[0], timeoutSec: Math.max(1, Math.min(50, (deadline - Date.now()) / 1000)), intervalSec: 10 });
      } while (st.timed_out && Date.now() < deadline);
      if (opt.out && st.state === 'completed') {
        const res = await bridge.fetchResult({ jobId: rest[0], outPath: opt.out });
        st = { ...st, saved_to: res.path, chars: res.chars };
      }
      if (opt.notify) notify('ChatGPT bridge', `${st.state}: ${st.job_id}`);
      return print(st);
    }
    case 'fetch': {
      const res = await bridge.fetchResult({ jobId: rest[0], outPath: opt.out, all: opt.all, closeTab: opt.close, force: opt.force });
      const { markdown, ...meta } = res;
      print(meta);
      if (!opt.out && markdown) print(`\n${markdown}`);
      return;
    }
    case 'reply':
      return print(await bridge.reply({ jobId: rest[0], text: await readText(rest.slice(1).join(' ')), files: opt.file }));
    case 'jobs':
      return print(bridge.jobs({ limit: Number(opt.limit || 20) }));
    case 'close':
      return print(await bridge.closeJob({ jobId: rest[0] }));
    case 'inspect':
      return print(await bridge.inspect({ jobId: rest[0] }));
    default:
      console.log(USAGE);
      process.exitCode = cmd && !opt.help ? 1 : 0;
  }
}

main()
  .catch((err) => {
    console.error(`[${err.code || 'error'}] ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => process.exit(), 50));
