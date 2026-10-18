---
source: https://chatgpt.com/c/<conversation-id>
mode: deep_research
model: "Pro"
fetched_at: 2026-10-01T13:53:51.354Z
---
# 2026년 AI 코딩 도구의 Model Context Protocol 공식 지원 현황

## Executive Summary

2026년 10월 1일 기준, 주요 에이전트형 AI 코딩 도구 대부분이 MCP를 공식 지원한다. 구현은 대체로 **로컬 `stdio` + 원격 Streamable HTTP** 조합으로 수렴했으며, SSE는 하위 호환용으로 남는 추세다. Cursor·Claude Code·Tabnine·Windsurf는 여러 transport를 직접 제공하고, VS Code·JetBrains는 IDE 자체가 MCP 클라이언트이면서 서버 배포·관리 기능까지 확대하고 있다. GitHub Copilot은 IDE/CLI와 GitHub.com cloud agent 사이에 지원 범위가 다르며, Amazon CodeWhisperer는 독립 제품보다 후속 **Amazon Q Developer/Kiro** 기준으로 보는 것이 정확하다.  [1](https://code.visualstudio.com/docs/agent-customization/mcp-servers) [2](https://cursor.com/docs/mcp) [3](https://code.claude.com/docs/en/mcp) [4](https://www.jetbrains.com/help/ai-assistant/mcp.html)

## 조사 범위와 판정 기준

여기서 “공식 지원”은 **제품 공급사가 MCP 클라이언트 연결 또는 MCP 서버 기능을 공식 문서·릴리스 노트에서 명시한 경우**로 한정했다. 단순 커뮤니티 확장이나 비공식 플러그인은 제외했다. GitHub Copilot X와 OpenAI Code Interpreter처럼 현재 독립 MCP 클라이언트 제품으로 보기 어려운 명칭은 아래 주석에서 별도로 정리했다.  [5](https://github.blog/news-insights/product-news/github-copilot-x-the-ai-powered-developer-experience/) [6](https://developers.openai.com/codex/changelog)

## 주요 도구별 MCP 지원 현황

| 도구명 | MCP 공식 지원 | 지원 방식 | 지원 시작 버전/날짜 | 공식 문서·릴리스 |
|---|---|---|---|---|
| **GitHub Copilot** | 예 | VS Code 등 IDE에서 `stdio`·HTTP; Copilot cloud agent는 local/remote MCP **tools** 지원. Cloud agent의 remote OAuth는 제한 | VS Code 1.99, 2025-03부터 MCP 구성 확인 | [GitHub Docs]  [7](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent) [VS Code 1.99]  [8](https://code.visualstudio.com/updates/v1_99) |
| **Microsoft VS Code AI/Agent** | 예 | `stdio`, Streamable HTTP; `.mcp.json`/`mcp.json`; MCP Gallery 설치. resources·prompts·MCP Apps도 지원 | **1.99 / 2025-03** | [VS Code Docs]  [1](https://code.visualstudio.com/docs/agent-customization/mcp-servers) [8](https://code.visualstudio.com/updates/v1_99) |
| **OpenAI Codex CLI/IDE** | 예 | 로컬 `stdio`, 원격 Streamable HTTP; Bearer/OAuth; 2026년에는 MCP 설정을 포함하는 **Codex plugin**도 지원 | 최초 정확 버전 **미확인**; 2026-09 현재 `codex mcp` 지속 지원 | [Codex Docs/Changelog]  [9](https://developers.openai.com/codex/cli) [6](https://developers.openai.com/codex/changelog) |
| **Amazon Q Developer / Kiro** *(구 CodeWhisperer)* | 예 | `stdio`, HTTP; remote MCP + OAuth; IDE 및 CLI | CLI **2025-04-29**, IDE **2025-06-12**, remote OAuth **2025-09-17** | [AWS Release History]  [10](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.html) |
| **Google Gemini Code Assist / Gemini CLI** | 예 | IDE agent mode; Gemini CLI는 `stdio`, SSE, Streamable HTTP | IDE MCP 전환 **2025-10-14**; VS Code agent mode 2.43.0 / IntelliJ 1.23.3부터 기반 제공 | [Google Cloud]  [11](https://docs.cloud.google.com/gemini/docs/codeassist/release-notes) [Gemini CLI]  [12](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) |
| **JetBrains AI Assistant** | 예 | `stdio`, Streamable HTTP, legacy SSE; IDE 측 MCP Server는 bundled plugin 형태 | MCP Client **IDE 2025.1**; IDE MCP Server **2025.2** | [JetBrains Docs]  [4](https://www.jetbrains.com/help/ai-assistant/mcp.html) [13](https://blog.jetbrains.com/idea/2025/05/intellij-idea-2025-1-model-context-protocol/) |
| **Tabnine Agent** | 예 | `stdio`, Streamable HTTP, SSE; IDE 설정/JSON | IDE “Add MCP Server” **v5.26.0 / 2025-12-14** | [Tabnine Docs]  [14](https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp-intro-and-setup) [15](https://docs.tabnine.com/main/administering-tabnine/release-notes) |
| **Replit Agent** | 예 | **원격 HTTPS endpoint 중심**; OAuth 또는 custom header; curated one-click MCP integrations | Custom MCP **2025-12-12** | [Replit Docs]  [16](https://docs.replit.com/build/connect-via-mcp) [17](https://docs.replit.com/updates/2025/12/12/changelog) |
| **Anthropic Claude Code** | 예 | `stdio`, Streamable HTTP, legacy SSE, **WebSocket**; CLI/JSON 설정 | 최초 버전 **미확인** | [Claude Code Docs]  [3](https://code.claude.com/docs/en/mcp) [18](https://code.claude.com/docs/en/mcp?fbclid=PAZnRzaAQQ4qRleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadJ1KNWenynwsPYUMSW7KZHtFjOebTpUO2OXuCmSFQbYF02yAGc8gEZ-92rgA_aem_sRjYTyLEVWtqwLPDB7UmmQ&fcdaa149_sort_date=desc) |
| **Cursor** | 예 | `stdio`, SSE, Streamable HTTP; remote OAuth; Marketplace/plugin·`mcp.json` | 최초 버전 **미확인** | [Cursor Docs]  [2](https://cursor.com/docs/mcp) |
| **Windsurf Cascade** | 예 | `stdio`, Streamable HTTP, SSE; HTTP/SSE OAuth; `mcp_config.json`/IDE 설정 | 최초 버전 **미확인** | [Windsurf/Devin Docs]  [19](https://docs.windsurf.com/plugins/cascade/mcp) |

## 명칭상 주의할 항목

**GitHub Copilot X**는 별도 2026 제품이라기보다 GitHub가 2023년에 발표한 “AI-powered developer experience에 대한 비전”이었다. 따라서 별도의 “Copilot X MCP 지원”을 판정하기보다는 현재 **GitHub Copilot**의 MCP 지원으로 보는 것이 적절하다.  [5](https://github.blog/news-insights/product-news/github-copilot-x-the-ai-powered-developer-experience/) [7](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent)

**OpenAI Code Interpreter** 역시 Codex와 같은 독립 MCP 호스트 제품으로 문서화돼 있지 않다. OpenAI 문서 체계에서도 Code Interpreter와 MCP servers는 별도 도구 범주이며, 코딩 환경에서 명확한 MCP 클라이언트 지원 대상은 **Codex CLI/IDE**다. 따라서 Code Interpreter 자체의 MCP 지원 여부는 **미확인**으로 보는 것이 보수적이다.  [6](https://developers.openai.com/codex/changelog) [9](https://developers.openai.com/codex/cli)

## 핵심 관찰

- **Transport가 수렴하고 있다.** 신규 구현은 `stdio`와 **Streamable HTTP**가 사실상 공통분모이며, SSE는 Claude Code·Cursor·JetBrains·Tabnine·Windsurf에서 주로 legacy 호환 목적으로 유지된다. WebSocket을 명시적으로 지원하는 대표 사례는 Claude Code다.  [3](https://code.claude.com/docs/en/mcp) [2](https://cursor.com/docs/mcp) [4](https://www.jetbrains.com/help/ai-assistant/mcp.html) [14](https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp-intro-and-setup) [19](https://docs.windsurf.com/plugins/cascade/mcp)
- **인증은 원격 MCP에서 OAuth 중심으로 이동**하고 있다. Cursor와 Windsurf는 HTTP/SSE에 OAuth를 제공하며 Replit도 로그인 기반 OAuth를 자동 처리한다. 반면 GitHub Copilot cloud agent는 현재 remote OAuth MCP를 지원하지 않는다는 명시적 제약이 있다.  [2](https://cursor.com/docs/mcp) [19](https://docs.windsurf.com/plugins/cascade/mcp) [16](https://docs.replit.com/build/connect-via-mcp) [7](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent)
- **MCP 지원 여부만으로 호환성을 판단하면 안 된다.** 예를 들어 Copilot cloud agent는 MCP의 tools만 지원하고 resources/prompts는 지원하지 않는 반면, VS Code와 Cursor는 더 넓은 MCP capability를 노출한다.  [7](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent) [1](https://code.visualstudio.com/docs/agent-customization/mcp-servers) [2](https://cursor.com/docs/mcp)
- **기업 배포에서는 실행 신뢰 경계가 핵심이다.** 로컬 `stdio` 서버는 사용자 머신에서 임의 코드를 실행할 수 있으므로 VS Code는 trust/sandbox 기능을 제공하고, JetBrains·Tabnine 등도 중앙 정책 또는 allowlist를 강화하고 있다. 또한 AWS는 Q CLI를 2025년 11월 **Kiro CLI**로 전환했고 Q Developer IDE 플러그인은 2027년 4월 지원 종료 예정이므로 신규 도입에서는 Kiro 경로를 함께 평가해야 한다.  [1](https://code.visualstudio.com/docs/agent-customization/mcp-servers) [4](https://www.jetbrains.com/help/ai-assistant/mcp.html) [15](https://docs.tabnine.com/main/administering-tabnine/release-notes) [10](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.html)

## 결론

2026년의 AI 코딩 생태계에서 MCP는 이미 실험적 플러그인 규격을 넘어 **주요 코딩 에이전트의 공통 외부 도구 인터페이스**로 자리 잡았다. 신규 통합이라면 우선 **`stdio` + Streamable HTTP**, OAuth 2.x, 명시적 tool approval와 서버 allowlist를 기준선으로 잡는 것이 가장 높은 상호운용성을 제공한다. 제품 선정 시에는 “MCP 지원”이라는 단일 체크박스보다 **지원 capability(tools/resources/prompts/apps), 원격 인증, 로컬 프로세스 격리, 조직 정책 적용 가능성**을 함께 비교하는 편이 안전하다.  [1](https://code.visualstudio.com/docs/agent-customization/mcp-servers) [2](https://cursor.com/docs/mcp) [4](https://www.jetbrains.com/help/ai-assistant/mcp.html) [7](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent)

## Sources

1. [Add and manage MCP servers in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
2. [Model Context Protocol (MCP) | Cursor Docs](https://cursor.com/docs/mcp)
3. [Connect Claude Code to tools via MCP - Claude Code Docs](https://code.claude.com/docs/en/mcp)
4. [Model Context Protocol (MCP) | AI Assistant Documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)
5. [GitHub Copilot X: The AI-powered developer experience](https://github.blog/news-insights/product-news/github-copilot-x-the-ai-powered-developer-experience/)
6. [ChatGPT & Codex changelog | ChatGPT Learn](https://developers.openai.com/codex/changelog)
7. [Model Context Protocol (MCP) and GitHub Copilot cloud agent - GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent)
8. [March 2025 (version 1.99)](https://code.visualstudio.com/updates/v1_99)
9. [Codex CLI | ChatGPT Learn](https://developers.openai.com/codex/cli)
10. [Document history for Amazon Q Developer User Guide - Amazon Q Developer](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.html)
11. [Gemini Code Assist release notes  |  Gemini for Google Cloud  |  Google Cloud Documentation](https://docs.cloud.google.com/gemini/docs/codeassist/release-notes)
12. [gemini-cli/docs/tools/mcp-server.md at main · google-gemini/gemini-cli · GitHub](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)
13. [IntelliJ IDEA 2025.1 ❤️ Model Context Protocol - The JetBrains Blog](https://blog.jetbrains.com/idea/2025/05/intellij-idea-2025-1-model-context-protocol/)
14. [https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp-intro-and-setup](https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp-intro-and-setup)
15. [https://docs.tabnine.com/main/administering-tabnine/release-notes](https://docs.tabnine.com/main/administering-tabnine/release-notes)
16. [Connect via MCP - Replit](https://docs.replit.com/build/connect-via-mcp)
17. [December 12, 2025 - Replit](https://docs.replit.com/updates/2025/12/12/changelog)
18. [Connect Claude Code to tools via MCP - Claude Code Docs](https://code.claude.com/docs/en/mcp?fbclid=PAZnRzaAQQ4qRleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadJ1KNWenynwsPYUMSW7KZHtFjOebTpUO2OXuCmSFQbYF02yAGc8gEZ-92rgA_aem_sRjYTyLEVWtqwLPDB7UmmQ&fcdaa149_sort_date=desc)
19. [Cascade MCP Integration](https://docs.windsurf.com/plugins/cascade/mcp)
