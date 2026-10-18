# ChatGPT 요금제별 Pro·심층 리서치 한도

[English](plan-limits.md) · **한국어**

*2026-10-19에 조사한 내용입니다. OpenAI가 이 숫자를 자주 바꾸고 도움말 페이지에서 대부분 지웠기 때문에, 그날 기준의 기록으로 보고 아래 링크로 직접 확인하세요.*

chatgpt-bridge는 내 ChatGPT 구독을 그대로 씁니다. `mode: "pro"`로 한 번 제출하면 GPT-6 Pro 메시지 1회, `mode: "deep_research"`로 한 번 제출하면 심층 리서치 작업 1회가 그 구독의 한도에서 빠집니다. 브리지는 한도를 따로 세거나 우회하지 않습니다.

출처 표시:
- **공식:** 현재 OpenAI 페이지에서 읽은 내용입니다.
- **보관본:** 웹 아카이브(Wayback Machine)에 남은 OpenAI 페이지입니다. 지금 페이지에서는 지워졌습니다.
- **비공식:** 언론 보도나 포럼 글입니다.

## 요금제별 GPT-6 Pro (파워 슬라이더의 'Pro' 단계)

| 요금제 | 가격 (월, USD) | 채팅에서 GPT-6 Pro | 출처 |
| --- | --- | --- | --- |
| Free | $0 | 사용 불가 | 공식 |
| Go | $8 (미국) | 사용 불가 | 공식 |
| Plus | $20 | 사용 불가. Plus는 Medium·High까지만 있고 Extra High와 Pro는 없음 | 공식 |
| Pro 100 | $100 | **주 50회.** GPT-5.6 Sol Pro와 같은 한도를 나눠 씀 | 보관본 (2026-09-22) |
| Pro 200 | $200 | **주 200회.** GPT-5.6 Sol Pro는 따로 하루 170회이고, 두 Pro 모델을 합쳐 하루 200회. 2026-10-30부터 **주 100회**로 준다는 보도가 있음 | 보관본 (2026-09-22). 감축은 비공식 |
| Pro 500 | $500 | "Pro 요금제 중 가장 많은 사용량". 주간 횟수는 미공개 | 공식 (숫자 없음) |
| Business Standard | 좌석당 월결제 $25 / 연결제 $20 | **월 15회.** GPT-5.6 Sol Pro와 나눠 씀 | 공식 |
| Business Premium | 좌석당 월결제 $125 / 연결제 $100 | **주 50회.** GPT-5.6 Sol Pro와 나눠 씀 | 공식 |
| Enterprise / Edu | 영업팀 문의 | 크레딧 방식: **GPT-6 Pro 메시지 1회에 50크레딧.** 관리자가 사용자별 월 한도를 정함. Pro를 돌리는 GPT-6 Astra는 기본으로 꺼져 있어 관리자가 켜야 함 | 공식 |

참고:
- **Pro 200 감축:** 2026-09-22부터 09-29 사이에 Pro 200을 쓰던 사용자는 2026-10-29까지 기존 한도를 유지합니다(공식). 그 뒤의 새 숫자는 OpenAI 페이지에 없고, The Next Web이 "OpenAI에 따르면" 2026-10-30부터 주 100회라고 보도했습니다.
- **다른 파워 단계:** Medium·High·Extra High의 주간·일간 횟수는 어느 요금제에서도 공개되지 않았습니다.
- **가격:** Go 가격은 OpenAI의 2026년 1월 발표 기준입니다. 한국 가격 페이지에는 Go ₩13,000, Plus ₩29,000, Pro ₩159,000부터로 나왔습니다.

## 요금제별 심층 리서치

| 요금제 | 심층 리서치 | 출처 |
| --- | --- | --- |
| Free, Go | "제한적". 횟수 미공개 | 공식 (가격 페이지) |
| Plus | "확장". 횟수 미공개 | 공식 (가격 페이지) |
| Pro 100 / 200 / 500 | "최대". 횟수 미공개 | 공식 (가격 페이지) |
| Business | 포함. 횟수 미공개. 포함량을 넘으면 작업 1회에 50크레딧 | 공식 |
| Enterprise | 작업 1회에 50크레딧 (크레딧 방식) | 공식 |
| Edu | 24시간마다 **5회**까지 크레딧 없이, 그 뒤로는 1회에 50크레딧 | 공식 |

인터넷에 아직 도는 '월 5 / 25 / 250회'는 OpenAI의 2025년 4월 공지에 나온 숫자라 지금은 맞지 않습니다.

## 한도 초기화와 한도에 걸렸을 때

- **심층 리서치:** 월 한도가 있는 요금제는 처음 쓴 날부터 30일마다 초기화됩니다(공식).
- **주간 Pro 한도:** 처음 쓴 때부터 7일씩 굴러가는지, 정해진 시각에 초기화되는지 OpenAI는 밝히지 않았습니다. 한도에 걸리면 ChatGPT가 초기화 시각을 보여 줍니다. 포럼에는 OpenAI 지원팀이 "롤링 방식"이라고 답했다는 글이 있습니다(비공식). 지원팀이 한도를 대신 초기화해 줄 수는 없습니다.
- **Pro 200이 주간 GPT-6 Pro 한도에 걸리면:** 자동으로 GPT-5.6 Thinking의 Medium 단계로 바뀝니다(공식).
- **Pro 100·Business:** 자동 전환에 대한 설명이 없습니다. 초기화될 때까지 Pro를 쓸 수 없습니다.
- **브리지에서 확인하는 법:** `chatgpt_submit` 결과의 `active_model`이 요청한 단계와 다르면 한도를 다 썼을 수 있습니다. 브리지의 Chrome 창에서 ChatGPT의 안내를 확인하세요.

## 출처

출처 목록과 각 페이지가 무엇을 뒷받침하는지는 [영문 문서의 Sources](plan-limits.md#sources)에 있습니다. 핵심 페이지는 다음과 같습니다.

- [GPT-6 and other models in ChatGPT](https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt)와 그 [2026-09-22 보관본](https://web.archive.org/web/20260922180331/https://help.openai.com/en/articles/20001354)
- [About ChatGPT Pro tiers](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers)
- [ChatGPT Business models and limits](https://help.openai.com/en/articles/12003714-chatgpt-business-models-and-limits)
- [ChatGPT rate card](https://help.openai.com/en/articles/11481834-chatgpt-rate-card)
- [Deep research in ChatGPT](https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt)
- [ChatGPT 가격](https://chatgpt.com/pricing)
- 비공식: [The Next Web, 2026-09-29](https://thenextweb.com/news/openai-devday-pro-200-usage-cut-pro-500-plan)

틀린 내용을 발견하면 페이지 링크와 날짜를 붙여 풀 리퀘스트를 보내 주세요.
