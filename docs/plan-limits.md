# ChatGPT plan limits for Pro and Deep research

**English** · [한국어](plan-limits.ko.md)

*Researched on 2026-10-19. OpenAI changes these often and has removed most numbers from its help pages, so treat this as a snapshot and check the linked pages.*

chatgpt-bridge uses your own ChatGPT subscription. Every `mode: "pro"` submit uses one GPT-6 Pro message, and every `mode: "deep_research"` submit uses one Deep research task, from that subscription's allowance. The bridge doesn't track or bypass these limits.

Labels:
- **official:** read on a live OpenAI page.
- **archived:** an OpenAI page as saved by the Wayback Machine; it's no longer on the live page.
- **unofficial:** press or forum reports.

## GPT-6 Pro (the "Pro" power level) by plan

| Plan | Price (USD/mo) | GPT-6 Pro in Chat | Source |
| --- | --- | --- | --- |
| Free | $0 | Not available | official |
| Go | $8 (US) | Not available | official |
| Plus | $20 | Not available. Plus has Medium and High only; Extra High and Pro aren't included. | official |
| Pro 100 | $100 | **50 messages/week**, one pool shared with GPT-5.6 Sol Pro | archived (2026-09-22) |
| Pro 200 | $200 | **200 messages/week**. GPT-5.6 Sol Pro has its own 170/day, with 200/day for both Pro models combined. Reported to drop to **100/week** from 2026-10-30. | archived (2026-09-22); the cut is unofficial |
| Pro 500 | $500 | "Highest included usage of the Pro plans"; the weekly count isn't published | official (no number) |
| Business Standard | $25 monthly or $20/yr per seat | **15 Pro messages/month**, shared with GPT-5.6 Sol Pro | official |
| Business Premium | $125 monthly or $100/yr per seat | **50 Pro messages/week**, shared with GPT-5.6 Sol Pro | official |
| Enterprise / Edu | contact sales | Credit-based: **50 credits per GPT-6 Pro message**. Admins set monthly per-user limits. GPT-6 Astra (the model behind Pro) is off by default and must be enabled. | official |

Notes:
- **Pro 200 change:** Pro 200 subscribers who were active between 2026-09-22 and 2026-09-29 keep the old allowance through 2026-10-29 (official). OpenAI's pages don't give the new number. The Next Web reported "OpenAI said" 100 GPT-6 Pro messages a week from 2026-10-30.
- **Other power levels:** OpenAI publishes no weekly or daily numbers for Medium, High or Extra High on any plan.
- **Prices:** Go's price is from OpenAI's January 2026 announcement. The live pricing page showed Korean-won prices: Go ₩13,000, Plus ₩29,000, and Pro from ₩159,000.

## Deep research by plan

| Plan | Deep research | Source |
| --- | --- | --- |
| Free, Go | "Limited"; count not published | official (pricing page) |
| Plus | "Expanded"; count not published | official (pricing page) |
| Pro 100 / 200 / 500 | "Maximum"; count not published | official (pricing page) |
| Business | Included; count not published. Beyond the included use, 50 credits per task. | official |
| Enterprise | 50 credits per task (credit billing) | official |
| Edu | **5 tasks per rolling 24 hours** at no credit cost, then 50 credits per task | official |

The 5 / 25 / 250 per month figures still quoted around the web come from OpenAI's April 2025 update. They're out of date.

## Resets and what happens at the limit

- **Deep research:** for plans with a monthly allowance, the counter resets every 30 days from your first use (official).
- **Weekly Pro window:** OpenAI doesn't say whether it is rolling or tied to a fixed time. ChatGPT shows the reset time when you hit it. A forum post quotes OpenAI Support as saying "rolling basis" (unofficial). OpenAI Support can't reset limits.
- **Pro 200 at the weekly GPT-6 Pro limit:** ChatGPT switches automatically to GPT-5.6 Thinking at Medium (official).
- **Pro 100 and Business:** no automatic switch is documented. Pro stays unavailable until the reset.
- **What the bridge does:** `chatgpt_submit` returns `active_model`. If it isn't the level you asked for, your allowance may have run out. Check the bridge's Chrome window for ChatGPT's notice.

## Sources

Official pages, read 2026-10-19. Update dates are approximate, converted from the help center's "N days ago".

1. [GPT-6 and other models in ChatGPT](https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt), updated ~2026-10-10: power levels, which plan gets which level, the Pro 200 fallback. No counts.
2. [Wayback copy of the same article, 2026-09-22](https://web.archive.org/web/20260922180331/https://help.openai.com/en/articles/20001354): the last official table of counts (Pro 200, Pro 100, Business).
3. [About ChatGPT Pro tiers](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers), updated ~2026-10-13: the three Pro plans, Pro 500, the Pro 200 grandfathering dates.
4. [ChatGPT Business models and limits](https://help.openai.com/en/articles/12003714-chatgpt-business-models-and-limits), updated ~2026-10-15: Standard 15/month and Premium 50/week.
5. [What is ChatGPT Business](https://help.openai.com/en/articles/8792828-what-is-chatgpt-business): seat prices.
6. [ChatGPT Enterprise and Edu models and limits](https://help.openai.com/en/articles/11165333-chatgpt-enterprise-and-edu-models-and-limits), updated ~2026-10-10.
7. [ChatGPT rate card](https://help.openai.com/en/articles/11481834-chatgpt-rate-card), updated ~2026-10-15: credit costs and Edu's included Deep research.
8. [Manage usage limits in Enterprise and Edu](https://help.openai.com/en/articles/20001001-manage-usage-limits-and-overages-in-chatgpt-enterprise-and-edu), updated ~2026-10-01: monthly per-user limits.
9. [Deep research in ChatGPT](https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt), updated ~2026-09-22: the 30-day reset.
10. [ChatGPT pricing](https://chatgpt.com/pricing): Limited / Expanded / Maximum labels.
11. [ChatGPT release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes): Pro 500 launch and the Pro 200 change on 2026-09-29, the GPT-6 rollout on 2026-10-07.
12. [Introducing ChatGPT Go](https://openai.com/index/introducing-chatgpt-go/), 2026-01-16: the $8 price.

Unofficial:

13. [The Next Web, 2026-09-29](https://thenextweb.com/news/openai-devday-pro-200-usage-cut-pro-500-plan): Pro 200 going from 200 to 100 GPT-6 Pro messages a week from 2026-10-30.
14. [OpenAI community forum thread](https://community.openai.com/t/chatgpt-pro-100-limit-appeared-almost-immediately-after-purchase-despite-minimal-pro-usage/1385374): the "rolling basis" quote.

Corrections are welcome. Open a pull request that links the page and gives its date.
