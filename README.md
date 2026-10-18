# chatgpt-bridge

[![test](https://github.com/leeheewon-01/chatgpt-bridge/actions/workflows/test.yml/badge.svg)](https://github.com/leeheewon-01/chatgpt-bridge/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [한국어](README.ko.md)

Ask ChatGPT (GPT-6 Pro, Deep research) from **Claude Code** or **Codex**: send a prompt and local files to chatgpt.com, keep working while it thinks for 5–30 minutes, and get the answer back as a Markdown file. It works through your own ChatGPT subscription in a dedicated Chrome window, so no API key is needed.

> [!WARNING]
> This is an unofficial tool, not made by or affiliated with OpenAI or Anthropic. It automates the chatgpt.com web UI with your own account.
> - **Terms of use:** automating the ChatGPT UI may conflict with OpenAI's terms, and your account is at your own risk.
> - **Breakage:** it can stop working whenever ChatGPT's UI changes. See [When ChatGPT's UI changes](#when-chatgpts-ui-changes).
> - **Uploads:** files you attach are uploaded to OpenAI.

## What it does

- **Pick the model.** It moves the GPT-6 power slider (Instant · Medium · High · Extra High · Pro), turns on Deep research, or picks a model version.
- **Upload files.** It attaches local files and checks that ChatGPT received them before sending.
- **Wait in the background.** A job is a ChatGPT conversation. It survives your agent session ending, and Claude Code, Codex and the CLI all share it.
- **Save clean Markdown.**
  - Normal answers are copied with ChatGPT's own Copy button, so code blocks, tables, math and links stay intact. Your clipboard is never touched.
  - Deep research reports are read from the research app's own state. Their citations become numbered links plus a `## Sources` list.
- **Stay safe.** It never types your password and never bypasses Cloudflare or other browser checks; it asks you to handle them.

Example output: [a Pro answer](examples/pro-test.md) and [a Deep research report](examples/deep-research-test.md).

## Requirements

- macOS, Linux or Windows with **Google Chrome** or Chromium. macOS is the most tested.
- **Node.js 22+** with `npm` on the `PATH` of Claude Code / Codex.
- A ChatGPT account. Pro needs a Pro, Business or Enterprise plan; see [plan limits](#plan-limits).

## Install

### Claude Code

```text
/plugin marketplace add leeheewon-01/chatgpt-bridge
/plugin install chatgpt-bridge@chatgpt-bridge
```

From a shell, the same two steps are:

```bash
claude plugin marketplace add leeheewon-01/chatgpt-bridge
claude plugin install chatgpt-bridge@chatgpt-bridge
```

Start a new session. `/mcp` should list `plugin:chatgpt-bridge:chatgpt_bridge` as connected.

### Codex (CLI or the ChatGPT desktop app)

```bash
codex plugin marketplace add leeheewon-01/chatgpt-bridge
codex plugin add chatgpt-bridge@chatgpt-bridge
```

Restart Codex. The first start installs the npm dependencies into the plugin folder, which takes about a minute. Codex allows 180 s for that.

### From a clone

```bash
git clone https://github.com/leeheewon-01/chatgpt-bridge.git
cd chatgpt-bridge
npm ci
node scripts/install.mjs        # or: node scripts/install.mjs claude | codex
```

This registers the clone as a local marketplace in both tools.
- **Claude Code** loads it in place, so your edits apply in the next session.
- **Codex** copies it, so re-run the script after editing.

## First run: sign in once

Ask your agent to check the ChatGPT session, or run the CLI:

```bash
node <plugin folder>/src/cli.js login
```

A Chrome window opens on chatgpt.com. Sign in there yourself. The session is kept in its own profile at `~/.chatgpt-bridge/profile`, separate from your everyday Chrome. The bridge never sees your password.

Why a separate Chrome? Since Chrome 136, remote debugging is ignored on the default profile. A dedicated profile also keeps the agent away from your other tabs and accounts.

## Usage

Just ask your agent, for example:

- "Send `spec.md` to GPT Pro and ask for the weakest parts of the design. Save the answer under research/."
- "Run ChatGPT Deep research on the current state of solid-state batteries."
- "Ask ChatGPT for a second opinion on this diff."

The bundled skill picks the right tools.
1. **Submit:** `chatgpt_submit` starts the job.
2. **Wait:** Claude Code waits with a background CLI and is notified when the job ends. Codex calls `chatgpt_wait`.
3. **Save:** `chatgpt_fetch` writes the Markdown file.

| Tool | What it does |
| --- | --- |
| `chatgpt_session` | Start the Chrome window if needed; report login state and file locations |
| `chatgpt_login` | Bring the window to the front so you can sign in |
| `chatgpt_submit` | New chat, then power level or Deep research, files and prompt; returns a `job_id` right away |
| `chatgpt_status` / `chatgpt_wait` | Current state / block until done (up to 25 min per call) |
| `chatgpt_reply` | Follow-up in the same chat, e.g. to answer Deep research's questions |
| `chatgpt_fetch` | Save the answer as Markdown (`out_path`, all turns, close tab) |
| `chatgpt_jobs` / `chatgpt_close` | Recent jobs / close a finished tab |
| `chatgpt_inspect` | Selector diagnostics for when the UI changes |

The `mode` argument of `chatgpt_submit`:

- **`instant`, `medium`, `high`, `extra_high`, `pro`:** positions of the power slider.
- **`deep_research`:** Deep research.
- **`default`:** keeps whatever is selected.

The chosen level stays as your ChatGPT default for new chats. Set `model_version` (for example `"GPT-5.6"`) to pick another entry of the version list.

A `job_id` is the ChatGPT conversation id, so a `chatgpt.com/c/...` URL works too.

### CLI

```bash
node src/cli.js submit --mode pro --file ./spec.pdf "Find the weak points of this design"
node src/cli.js wait <job_id> --timeout 3600 --out ./research/review.md --notify
node src/cli.js status <job_id>
node src/cli.js jobs
```

## Plan limits

Every `pro` submit uses one GPT-6 Pro message, and every `deep_research` submit uses one Deep research task, from your plan's allowance. Snapshot from 2026-10-19:

| Plan | GPT-6 Pro in Chat |
| --- | --- |
| Free · Go · Plus | not included |
| Pro 100 ($100) | 50 / week (archived official figure) |
| Pro 200 ($200) | 200 / week (archived official figure); reported to drop to 100 / week from 2026-10-30 |
| Pro 500 ($500) | highest of the Pro plans; count not published |
| Business Standard / Premium | 15 / month · 50 / week |
| Enterprise · Edu | credits: 50 per GPT-6 Pro message |

OpenAI doesn't publish Deep research counts for most plans. Details, sources and caveats are in [docs/plan-limits.md](docs/plan-limits.md).

## How it works

```text
Claude Code ─┐                          ┌─ dedicated Chrome (~/.chatgpt-bridge/profile)
Codex ───────┼─ MCP server / CLI ─ CDP ─┤    chatgpt.com tabs, one per job
CLI ─────────┘   (src/bridge.js)        └─ Deep research app iframe (read over raw CDP)
```

- **Shared Chrome:** every bridge process connects to one Chrome over the DevTools protocol on `127.0.0.1:9339`. A launch lock prevents two windows from starting.
- **Selectors:** `selectors.json` holds everything the bridge knows about ChatGPT's page. It is re-read on every call.
- **Completion check:** an answer is complete when the stop button is gone and the reply's action-bar Copy button appears.
- **Deep research:** it runs inside a sandboxed app iframe. The bridge reads that app's `window.openai.widgetState` (plan, status, report) and nothing else from it.
- **State files:** jobs live in `~/.chatgpt-bridge/jobs.json`, and every fetched answer is also copied to `~/.chatgpt-bridge/results/<job_id>.md`.

| File | Role |
| --- | --- |
| `src/server.js` | MCP server (stdio) |
| `src/cli.js` | The same features as a CLI |
| `src/bridge.js` | Submit, status, wait and fetch logic |
| `src/dom.js` | Code that runs inside the page: element lookup, completion check, extraction |
| `src/deepresearch.js`, `src/appframe.js` | Deep research state and citations, raw CDP into its iframe |
| `scripts/start.mjs` | Plugin entry point; installs dependencies on the first start |

## When ChatGPT's UI changes

Errors tagged `[selector]` or `[model]` mean the page no longer matches. Run `chatgpt_inspect` (or `node src/cli.js inspect`). In its `matches` list, entries that print `NO MATCH` are the ones to fix.

Put corrected entries in `~/.chatgpt-bridge/selectors.json`. Its top-level keys replace the bundled ones, it is re-read on every call, and it survives plugin updates. For example:

```json
{ "stopButton": ["button[aria-label*='Stop']", "button[data-testid='stop-button']"] }
```

Pull requests that update `selectors.json` are very welcome.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `CHATGPT_BRIDGE_HOME` | `~/.chatgpt-bridge` | profile, jobs, results, selector override |
| `CHATGPT_BRIDGE_PORT` | `9339` | Chrome remote-debugging port, bound to 127.0.0.1 |
| `CHATGPT_BRIDGE_CHROME` | auto-detected | path to the Chrome or Chromium executable |
| `CHATGPT_BRIDGE_SELECTORS` | bundled `selectors.json` | replace the selector file entirely |

## Update and uninstall

- **Claude Code:**
  - Update: `claude plugin marketplace update chatgpt-bridge`, then `claude plugin update chatgpt-bridge@chatgpt-bridge`.
  - Uninstall: `claude plugin uninstall chatgpt-bridge@chatgpt-bridge`.
- **Codex:**
  - Update: `codex plugin marketplace upgrade chatgpt-bridge`, then `codex plugin add chatgpt-bridge@chatgpt-bridge`.
  - Uninstall: `codex plugin remove chatgpt-bridge@chatgpt-bridge`.
- **Your data:** your login and results stay in `~/.chatgpt-bridge`. Delete that folder to remove them.

## Troubleshooting

- **`needs_login`:** sign in in the bridge's Chrome window. `chatgpt_login` brings it to the front.
- **`challenge`:** ChatGPT is showing a browser check. Complete it in that window.
- **The server doesn't start in Codex:**
  - Codex must find `node` (22+) and `npm` on its `PATH`. GUI apps sometimes get a shorter `PATH` than your terminal.
  - If the first-start install failed, run `npm ci` in the plugin folder that the error names.
- **`Chrome not found`:** set `CHATGPT_BRIDGE_CHROME` to the full path of the Chrome executable.
- **Tool names doubled:** you have both an old manual MCP entry and the plugin. Remove the manual one (`claude mcp remove -s user chatgpt_bridge`).
- **The wrong power level is used:** `active_model` in the submit result shows what ChatGPT selected. If Pro isn't available, your plan may not include it or this week's allowance may be used up.

## Security and privacy

- **The debugging port:** it listens on 127.0.0.1 only. Still, any program running as your user can drive the bridge's Chrome profile, so don't sign in to unrelated accounts in that window, and turn off Chrome sync there.
- **What leaves your computer:** only what you send to ChatGPT. The bridge sends no telemetry.
- **ChatGPT's output:** Deep research quotes web pages. The skill tells the agent to treat answers as data, not instructions.
- **Plugin code:** a plugin runs with your user permissions, so read the code before you install it.

## Development

```bash
npm ci
npm test
```

The tests drive a local fake ChatGPT page in a throwaway headless Chrome; they never contact chatgpt.com. They cover:
- choosing the power level, attaching files, and submit → wait → copy-based extraction;
- follow-ups in the same chat, and the fallback HTML extraction;
- Deep research app state and citations;
- logout detection and model-version errors.

## License

[MIT](LICENSE)
