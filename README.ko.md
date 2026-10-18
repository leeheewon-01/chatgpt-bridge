# chatgpt-bridge

[![test](https://github.com/leeheewon-01/chatgpt-bridge/actions/workflows/test.yml/badge.svg)](https://github.com/leeheewon-01/chatgpt-bridge/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) · **한국어**

**Claude Code**나 **Codex**에서 ChatGPT(GPT-6 Pro, 심층 리서치)에 프롬프트와 로컬 파일을 보내는 플러그인입니다. ChatGPT가 5~30분 동안 생각하는 사이에 다른 작업을 이어 갈 수 있고, 끝나면 답변을 Markdown 파일로 받아 옵니다. API 키 없이, 전용 Chrome 창에서 내 ChatGPT 구독을 그대로 씁니다.

> [!WARNING]
> 비공식 도구입니다. OpenAI·Anthropic과 관계없으며, 내 계정으로 chatgpt.com 화면을 자동 조작합니다.
> - **이용약관:** ChatGPT 화면 자동화는 OpenAI 이용약관에 어긋날 수 있고, 계정 위험은 사용자 책임입니다.
> - **고장:** ChatGPT 화면이 바뀌면 동작이 깨질 수 있습니다. 아래 [ChatGPT 화면이 바뀌었을 때](#chatgpt-화면이-바뀌었을-때)를 보세요.
> - **업로드:** 첨부한 파일은 OpenAI로 업로드됩니다.

## 하는 일

- **모델 선택:** GPT-6 파워 슬라이더(Instant · Medium · High · Extra High · Pro)를 고르거나, 심층 리서치를 켜거나, 모델 버전을 고릅니다.
- **파일 업로드:** 로컬 파일을 첨부하고, ChatGPT에 다 올라간 것을 확인한 뒤 전송합니다.
- **백그라운드 대기:** 작업 하나가 ChatGPT 대화 하나입니다. 에이전트 세션이 끝나도 작업은 남고, Claude Code·Codex·CLI가 같은 작업을 함께 씁니다.
- **깔끔한 Markdown 저장**
  - 일반 답변은 ChatGPT의 '복사' 버튼이 만드는 Markdown을 그대로 받아 와서 코드·표·수식·링크가 유지됩니다. 시스템 클립보드는 건드리지 않습니다.
  - 심층 리서치 보고서는 리서치 앱의 상태에서 직접 읽고, 인용을 번호 링크와 `## Sources` 목록으로 바꿉니다.
- **안전 장치:** 비밀번호를 직접 입력하지 않고, Cloudflare 같은 봇 확인을 우회하지 않습니다. 이런 화면이 뜨면 사용자에게 맡깁니다.

결과 예시: [Pro 답변](examples/pro-test.md), [심층 리서치 보고서](examples/deep-research-test.md)

## 준비물

- **Google Chrome** 또는 Chromium이 설치된 macOS·Linux·Windows. macOS에서 가장 많이 테스트했습니다.
- **Node.js 22 이상.** Claude Code·Codex의 `PATH`에서 `npm`을 찾을 수 있어야 합니다.
- ChatGPT 계정. Pro를 쓰려면 Pro·Business·Enterprise 요금제가 필요합니다. 아래 [요금제별 한도](#요금제별-한도)를 보세요.

## 설치

### Claude Code

```text
/plugin marketplace add leeheewon-01/chatgpt-bridge
/plugin install chatgpt-bridge@chatgpt-bridge
```

셸에서는 다음 두 줄로 같은 일을 합니다.

```bash
claude plugin marketplace add leeheewon-01/chatgpt-bridge
claude plugin install chatgpt-bridge@chatgpt-bridge
```

새 세션을 시작하고 `/mcp`를 실행해, `plugin:chatgpt-bridge:chatgpt_bridge`가 연결됨으로 보이면 설치된 것입니다.

### Codex (CLI 또는 ChatGPT 데스크톱 앱)

```bash
codex plugin marketplace add leeheewon-01/chatgpt-bridge
codex plugin add chatgpt-bridge@chatgpt-bridge
```

Codex를 다시 시작합니다. 처음 시작할 때 플러그인 폴더에 npm 의존성을 설치하느라 1분쯤 걸립니다. Codex는 시작에 180초까지 기다립니다.

### 저장소를 직접 받아 설치

```bash
git clone https://github.com/leeheewon-01/chatgpt-bridge.git
cd chatgpt-bridge
npm ci
node scripts/install.mjs        # 한쪽만: node scripts/install.mjs claude | codex
```

받은 폴더를 두 도구에 로컬 마켓플레이스로 등록합니다.
- **Claude Code:** 폴더를 그 자리에서 읽어서, 코드를 고치면 다음 세션부터 바로 반영됩니다.
- **Codex:** 폴더를 복사해 가므로, 코드를 고친 뒤에는 스크립트를 다시 실행해야 합니다.

## 처음 한 번: 로그인

에이전트에게 ChatGPT 세션을 확인해 달라고 하거나, CLI로 실행합니다.

```bash
node <플러그인 폴더>/src/cli.js login
```

chatgpt.com이 열린 Chrome 창이 뜨면 직접 로그인합니다. 로그인 상태는 평소 쓰는 Chrome과 분리된 전용 프로필(`~/.chatgpt-bridge/profile`)에 남습니다. 브리지는 비밀번호를 보지 않습니다.

전용 Chrome을 따로 쓰는 이유는 두 가지입니다.
- Chrome 136부터 기본 프로필에서는 원격 디버깅이 무시됩니다.
- 에이전트가 평소 쓰는 탭과 계정에 손대지 못합니다.

## 사용

에이전트에게 말로 요청하면 됩니다. 예를 들면 이렇습니다.

- "`spec.md`를 GPT Pro에 보내서 설계 약점을 찾아 달라고 하고, 결과를 research/에 저장해줘"
- "전고체 배터리 현황으로 ChatGPT 심층 리서치 돌려줘"
- "이 diff를 ChatGPT한테 보내서 의견 받아줘"

함께 들어 있는 스킬이 알맞은 도구를 고릅니다.
1. **제출:** `chatgpt_submit`으로 작업을 시작합니다.
2. **대기:** Claude Code는 백그라운드 CLI로 기다리다가 끝나면 알림을 받고, Codex는 `chatgpt_wait`를 씁니다.
3. **저장:** `chatgpt_fetch`가 Markdown 파일로 저장합니다.

| 도구 | 하는 일 |
| --- | --- |
| `chatgpt_session` | 필요하면 Chrome을 띄우고, 로그인 상태와 파일 위치를 알려 줌 |
| `chatgpt_login` | 로그인할 수 있게 창을 앞으로 띄움 |
| `chatgpt_submit` | 새 대화를 열고 파워 단계 또는 심층 리서치를 고른 뒤 파일과 프롬프트를 보냄. `job_id`를 바로 돌려줌 |
| `chatgpt_status` / `chatgpt_wait` | 현재 상태 / 끝날 때까지 대기 (한 번에 최대 25분) |
| `chatgpt_reply` | 같은 대화에 후속 메시지 (심층 리서치의 확인 질문에 답할 때 등) |
| `chatgpt_fetch` | 답변을 Markdown으로 저장 (`out_path`, 전체 대화, 탭 닫기) |
| `chatgpt_jobs` / `chatgpt_close` | 최근 작업 목록 / 끝난 탭 닫기 |
| `chatgpt_inspect` | 화면이 바뀌었을 때 셀렉터 진단 |

`chatgpt_submit`의 `mode` 값:

- **`instant` · `medium` · `high` · `extra_high` · `pro`:** 파워 슬라이더의 단계입니다.
- **`deep_research`:** 심층 리서치입니다.
- **`default`:** 지금 선택된 것을 그대로 씁니다.

고른 단계는 ChatGPT 기본값으로 남아 다음 새 채팅에도 적용됩니다. 특정 버전을 쓰려면 `model_version`(예: `"GPT-5.6"`)을 지정합니다.

`job_id`는 ChatGPT 대화 id라서, `chatgpt.com/c/...` 주소를 그대로 넘겨도 됩니다.

### CLI

```bash
node src/cli.js submit --mode pro --file ./spec.pdf "이 설계의 약점을 찾아줘"
node src/cli.js wait <job_id> --timeout 3600 --out ./research/review.md --notify
node src/cli.js status <job_id>
node src/cli.js jobs
```

## 요금제별 한도

`pro` 제출은 GPT-6 Pro 메시지를, `deep_research` 제출은 심층 리서치 작업을 1회씩 내 요금제 한도에서 씁니다. 2026-10-19에 조사한 내용입니다.

| 요금제 | 채팅에서 GPT-6 Pro |
| --- | --- |
| Free · Go · Plus | 포함 안 됨 |
| Pro 100 ($100) | 주 50회 (보관된 공식 페이지 기준) |
| Pro 200 ($200) | 주 200회 (보관된 공식 페이지 기준). 2026-10-30부터 주 100회로 준다는 보도가 있음 |
| Pro 500 ($500) | Pro 요금제 중 최대. 횟수 미공개 |
| Business Standard / Premium | 월 15회 / 주 50회 |
| Enterprise · Edu | 크레딧 방식, GPT-6 Pro 메시지 1회에 50크레딧 |

심층 리서치 횟수는 대부분의 요금제에서 공개되지 않았습니다. 출처와 주의 사항까지 담은 자세한 내용은 [docs/plan-limits.ko.md](docs/plan-limits.ko.md)에 있습니다.

## 동작 방식

```text
Claude Code ─┐                          ┌─ 전용 Chrome (~/.chatgpt-bridge/profile)
Codex ───────┼─ MCP 서버 / CLI ── CDP ──┤    작업마다 chatgpt.com 탭 하나
CLI ─────────┘   (src/bridge.js)        └─ 심층 리서치 앱 iframe (CDP로 직접 읽음)
```

- **공유 Chrome:** 모든 브리지 프로세스가 `127.0.0.1:9339`의 DevTools 프로토콜로 Chrome 하나에 붙습니다. 실행 잠금이 있어서 창이 두 개 뜨지 않습니다.
- **셀렉터:** ChatGPT 화면에 대한 지식은 모두 `selectors.json`에 있고, 매 호출마다 다시 읽습니다.
- **완료 판정:** 중지 버튼이 사라지고 답변 아래 동작 막대의 '복사' 버튼이 나타나면 끝난 것으로 봅니다.
- **심층 리서치:** 샌드박스 iframe 안의 별도 앱에서 돕니다. 브리지는 그 앱의 `window.openai.widgetState`(계획, 상태, 보고서)만 읽습니다.
- **기록 파일:** 작업 기록은 `~/.chatgpt-bridge/jobs.json`에 두고, 받아 온 답변의 사본도 `~/.chatgpt-bridge/results/<job_id>.md`에 남깁니다.

| 파일 | 역할 |
| --- | --- |
| `src/server.js` | MCP 서버 (stdio) |
| `src/cli.js` | 같은 기능의 CLI |
| `src/bridge.js` | 제출·상태·대기·추출 로직 |
| `src/dom.js` | 페이지 안에서 도는 요소 탐색·완료 판정·추출 코드 |
| `src/deepresearch.js`, `src/appframe.js` | 심층 리서치 상태와 인용 변환, iframe에 CDP로 직접 접근 |
| `scripts/start.mjs` | 플러그인 시작점. 처음 시작할 때 의존성을 설치함 |

## ChatGPT 화면이 바뀌었을 때

`[selector]`나 `[model]`이 붙은 오류는 화면 구조가 바뀌었다는 뜻입니다. `chatgpt_inspect`(또는 `node src/cli.js inspect`)를 실행하고, `matches`에서 `NO MATCH`로 나온 항목을 고치면 됩니다.

고친 항목은 `~/.chatgpt-bridge/selectors.json`에 넣습니다.
- 이 파일의 최상위 키가 기본 셀렉터를 대체합니다.
- 매 호출마다 다시 읽어서 재시작이 필요 없습니다.
- 플러그인을 업데이트해도 남습니다.

예:

```json
{ "stopButton": ["button[aria-label*='Stop']", "button[data-testid='stop-button']"] }
```

`selectors.json`을 고친 풀 리퀘스트는 언제든 환영합니다.

## 설정

| 환경 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `CHATGPT_BRIDGE_HOME` | `~/.chatgpt-bridge` | 프로필·작업 기록·결과·셀렉터 덮어쓰기 파일 |
| `CHATGPT_BRIDGE_PORT` | `9339` | Chrome 원격 디버깅 포트 (127.0.0.1에만 열림) |
| `CHATGPT_BRIDGE_CHROME` | 자동 탐색 | Chrome 또는 Chromium 실행 파일 경로 |
| `CHATGPT_BRIDGE_SELECTORS` | 기본 `selectors.json` | 셀렉터 파일을 통째로 바꿈 |

## 업데이트와 삭제

- **Claude Code**
  - 업데이트: `claude plugin marketplace update chatgpt-bridge`를 실행한 뒤 `claude plugin update chatgpt-bridge@chatgpt-bridge`
  - 삭제: `claude plugin uninstall chatgpt-bridge@chatgpt-bridge`
- **Codex**
  - 업데이트: `codex plugin marketplace upgrade chatgpt-bridge`를 실행한 뒤 `codex plugin add chatgpt-bridge@chatgpt-bridge`
  - 삭제: `codex plugin remove chatgpt-bridge@chatgpt-bridge`
- **내 데이터:** 로그인 상태와 결과는 `~/.chatgpt-bridge`에 남습니다. 지우려면 이 폴더를 삭제하세요.

## 문제 해결

- **`needs_login`:** 브리지의 Chrome 창에서 로그인하세요. `chatgpt_login`이 창을 앞으로 띄웁니다.
- **`challenge`:** ChatGPT가 봇 확인 화면을 띄운 것입니다. 그 창에서 직접 통과하세요.
- **Codex에서 서버가 시작되지 않을 때**
  - Codex의 `PATH`에서 `node`(22 이상)와 `npm`을 찾을 수 있어야 합니다. GUI 앱은 터미널보다 `PATH`가 짧을 때가 있습니다.
  - 처음 시작할 때의 설치가 실패했다면, 오류 메시지에 나온 플러그인 폴더에서 `npm ci`를 실행하세요.
- **`Chrome not found`:** `CHATGPT_BRIDGE_CHROME`에 Chrome 실행 파일의 전체 경로를 지정하세요.
- **도구가 두 벌로 보일 때:** 예전에 수동으로 등록한 MCP와 플러그인이 둘 다 있는 것입니다. 수동 등록을 지우세요(`claude mcp remove -s user chatgpt_bridge`).
- **원하는 파워 단계가 안 걸릴 때:** 제출 결과의 `active_model`이 ChatGPT가 실제로 고른 단계입니다. Pro가 안 되면 요금제에 포함되지 않았거나 이번 주 한도를 다 쓴 것일 수 있습니다.

## 보안과 개인정보

- **디버깅 포트:** 127.0.0.1에만 열리지만, 같은 사용자 권한으로 도는 프로그램은 브리지의 Chrome 프로필을 조작할 수 있습니다. 그 창에서는 다른 계정에 로그인하지 말고, Chrome 동기화도 끄세요.
- **밖으로 나가는 것:** ChatGPT에 보내는 내용뿐입니다. 텔레메트리는 없습니다.
- **ChatGPT 답변:** 심층 리서치는 웹 페이지를 인용합니다. 스킬은 에이전트가 답변을 지시가 아닌 정보로 다루도록 안내합니다.
- **플러그인 코드:** 플러그인은 내 사용자 권한으로 실행됩니다. 설치하기 전에 코드를 확인하세요.

## 개발

```bash
npm ci
npm test
```

테스트는 임시 headless Chrome에서 가짜 ChatGPT 페이지를 조작하며, 실제 chatgpt.com에는 접속하지 않습니다. 다음을 확인합니다.
- 파워 단계 선택, 파일 첨부, 제출 → 대기 → 복사 버튼 기반 추출
- 같은 대화 이어 쓰기와 HTML 대체 추출
- 심층 리서치 앱 상태와 인용 변환
- 로그아웃 감지와 모델 버전 오류

## 라이선스

[MIT](LICENSE)
