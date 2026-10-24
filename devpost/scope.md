---
doc: scope
status: approved
---

# FlowProof AI

A local-first Windows desktop AI agent that tests user-defined flows in localhost web applications and produces evidence-backed functional findings and UX observations.

## The Unique Kernel

An autonomous-by-default audit workspace with a real native embedded Chromium session shared with Playwright. Users observe actual execution, answer structured agent questions, and may interact directly with the same browser only through explicit safe exclusive control handoff. A finding earns verification through reproducible Agent execution and a traceable expected-versus-observed mismatch; manual interaction or model reasoning alone cannot verify it.

## Who It's For

Designers and developers checking a web application running on their own machine, who want actionable findings with reproducible steps and suggested fixes. They supply the target, goal, and any requirements needed to establish expected behavior.

## The Core Loop

1. Open FlowProof AI, configure an AI provider, API key, and model, and create or select a locally saved project. No FlowProof AI account is required.
2. Start an audit with an explicitly authorized localhost URL, a user-defined goal, relevant context, and execution limits.
3. The agent autonomously forms a plan, creates TODOs, and uses Playwright to inspect and interact with the application. When clarification, a decision, or required information is needed, it calls `ask_user`, pauses safely in Awaiting Input, and resumes after the user answers.
4. Observe actual activity, TODOs, findings, and native continuously rendered embedded Chromium. Respond through `ask_user` and, when needed, explicitly hand browser ownership from Agent to User without simultaneous control. Suspend Agent browser operations while the User owns control; on return, inspect actual state before continuing. Distinguish manual actions in history and do not count them automatically as verified Agent execution. There is no persistent composer, general messaging, or generic Pause/Resume/Stop/audit-goal redirection control.
5. The agent collects actual browser evidence, attempts independent reproduction, checks alternative explanations, and classifies findings according to the verification contract below.
6. Review a structured report and reopen the saved project, audit session, report, and linked evidence locally. Return with another goal or target, or to check an application revision.

## Inspiration & Identity

The execution interface is inspired by [Codex](https://openai.com/codex/), [Claude Code](https://code.claude.com/docs/en/overview), and [OpenCode](https://opencode.ai/): autonomous Agent execution by default, a native shared browser, structured questions, explicit exclusive browser handoff, and inspectable evidence. The learner wants a focused, reliable, polished desktop product. Visual design specifics belong in the PRD.

## Mandatory PRD Requirements

The PRD must carry these requirements forward and define their detailed experience and behavior:

- **Premium Desktop UX:** A polished startup experience, a first-launch New Audit empty state, an animated New Audit overlay, an off-white workspace, a project sidebar with distinctive letter-based icons, and a professional agent workspace inspired by modern coding agents.
- **Real Live Browser Preview:** Require a real interactive Chromium browser embedded in the workspace with native continuous rendering, including animations, scrolling, navigation, typing, and dynamic updates. Playwright must control that exact displayed session, with explicit exclusive Agent/User handoff, isolation from privileged Electron functionality, and authorized localhost navigation for both owners. Screenshot streaming or a duplicate hidden browser does not meet this requirement. During 4-spec, investigate Electron WebContents embedding and BrowserView alternatives, Chromium DevTools Protocol integration, and Playwright CDP connectivity. Document compatibility, security, session fidelity, and recovery tradeoffs; feasibility is not yet established. Report any limitation preventing a truly shared interactive session before proposing a change to the approved UX.
- **Agent Reliability:** Explicitly define internal cancellation and cleanup for application shutdown, critical failures, execution-budget exhaustion, and other safety conditions, alongside provider disconnection, browser failures, and structured `ask_user` interactions. Question-driven pausing and resumption are automatic. Internal cancellation preserves trustworthy partial evidence and clearly labels incomplete results; it is not a user-facing execution control.

## Why This Matters to the Learner

Build "a reliable, fully functional end-to-end AI agent workflow that combines intelligent reasoning, browser automation, and evidence-based UX auditing." The practical focus is tool orchestration, error handling, and validating AI-generated findings, using an experienced developer's concise, spec-driven workflow.

## What "Working" Looks Like

The finished proof of concept demonstrates the complete FlowProof AI experience, including:

- Real BYOK execution using a selected model, with working integrations for OpenAI, Anthropic, Google Gemini, and OpenRouter, and OS-backed API-key storage.
- A user-provided localhost URL and goal driving a real Playwright audit without application-specific execution logic.
- Live actions and observations, evolving TODOs, actual Playwright browser state, tool details, and findings staying synchronized to the current audit session.
- Structured `ask_user` interactions supporting single-choice, multiple-choice, and free-text responses, with a safe Awaiting Input pause and resumption after the user answers; no persistent composer or general-purpose messaging during execution.
- A native embedded browser shared with Playwright, mutually exclusive Agent/User ownership, suspended Agent browser operations during User control, fresh inspection on return, and manual actions clearly separated from verified Agent execution evidence.
- Working internal cancellation and cleanup for shutdown, critical failures, exhausted budgets, or safety conditions, preserving trustworthy partial evidence and clearly labeling interrupted audit results as incomplete.
- An evidence-backed Verified Finding on a reproducible seeded defect, and conservative classification when an expectation or reproduction cannot be established.
- Enforced navigation and execution boundaries, with incomplete or failed execution reported honestly and no fabricated actions or evidence.
- Multiple projects and saved sessions available locally, with reports and evidence reopening after an application restart and only one audit executing at a time.

The memorable moment: a user watches the autonomous agent encounter a problem, gather evidence, independently reproduce it in the browser, and produce a finding whose evidence the user can inspect.

### Acceptance Fixture and Implementation Order

Build FlowProof AI first. Introduce or reuse a minimal local test application later when needed for end-to-end validation. The initial acceptance fixture is a small React application at `http://localhost:3000` with a deliberately introduced sign-in usability or functional issue, such as missing feedback after incorrect credentials.

The initial goal is: "Test the complete sign-in flow, identify functional and UX problems, and provide evidence-backed findings with reproducible steps and suggested fixes."

Provide a traceable expectation for the seeded defect so verification can be tested. This fixture exercises the general URL-and-goal-driven product; changing the authorized URL, port, path, or user goal must not require sign-in-specific product logic.

Hackathon delivery includes a short demo video and a public GitHub repository; deployment is optional. The curriculum targets 2–4 hours of active work. This requested scope remains ambitious for that timebox even with the execution boundaries below.

## The POC Boundary

### Execution and Product Breadth

- **Platform:** Windows 11 x64.
- **Automation:** Playwright with native embedded Chromium; one isolated shared browser session/context and single shared tab per active audit. Playwright attaches to the exact displayed session; no duplicate hidden automation browser.
- **Targets:** Localhost web applications with configurable ports and paths. Browser automation is restricted to explicitly authorized targets and enforced navigation boundaries.
- **Concurrency:** One active audit at a time. Multiple projects and audit sessions can be saved locally.
- **AI:** OpenAI, Anthropic, Google Gemini, and OpenRouter through BYOK, with user-selectable models. The runtime and persisted product data are local; model requests use the selected provider.
- **Budgets:** Configurable agent-step and timeout limits, plus token/cost usage limits where provider information is available. Missing usage information must remain explicit.
- **Preflight and setup drafts:** On entering Review & Start, automatically check provider/model connectivity, localhost availability, explicit authorization, and valid budgets; show the exact target, project name, goal, and individual Checking/Passed/Failed states. Disable Start Audit until all required checks pass, provide actionable Retry Checks without data loss, invalidate/rerun affected checks on changes, and revalidate critical conditions immediately before activation. Dismissal preserves only non-sensitive draft fields/progress for continuation or Start Fresh, clears consent, and invalidates prior preflight authority. Keep secrets out of ordinary draft storage; securely saved provider configuration can be reused without revealing its key. Keep setup responsive and distinct from execution; opening/dismissal creates no empty project/session or accidental audit, and activation gates precede all browser automation.
- **Workspace:** An autonomous-by-default activity feed, dynamic TODOs, native embedded browser, findings, and expandable actual tool details. Execution-affecting user interaction is through structured `ask_user` and explicit exclusive browser handoff/direct input. Normal UI navigation/resizing does not transfer ownership or interrupt the agent. No persistent composer, general messaging, or generic Pause/Resume/Stop/audit-goal redirection controls.
- **Structured response validation and Skip:** Validate ask_user responses against the declared schema in both UI and trusted Agent runtime: exactly one valid single-choice option, configured multiple-choice counts, required non-blank text, reasonable length limits, and declared formats. Inline errors preserve entered data under existing sensitive-input protections; invalid/incomplete responses never resume execution. Only explicitly supported Skip resolves a question without an answer and is recorded as a distinct outcome, never denial or authorization. Evaluate safe goal-relevant alternatives and record skipped work/coverage impact, or end as Blocked if missing required information prevents the goal and no safe continuation remains. Skip history retains only non-sensitive question metadata and its outcome, without fabricated answers, actions, findings, or verification. Dismissal leaves Awaiting Input; required questions without Skip support cannot be bypassed.
- **Browser ownership:** Agent owns control by default. Explicit safe handoff grants direct User interaction while Agent browser operations are suspended; never allow simultaneous control. On return to Agent ownership, inspect actual browser state before continuing. Handoff preserves authorized navigation/security policy, internal cancellation/budgets, and one active audit/session.
- **Handoff lifecycle:** Show Agent in Control with Take Control. A request enters Handoff Pending, immediately blocks new Agent browser operations, and waits for bounded safe completion of in-flight work before enabling User input. Show You are in Control with Return Control to Agent; suspend browser-dependent Agent execution. Returning disables manual input before URL/page/DOM/session inspection and plan/TODO reconciliation. Record uncertain outcomes honestly and use safe recovery without blind replay. Keep handoff distinct from ask_user; crash-time ownership restoration follows the explicit User Control and Handoff Pending recovery decisions in `prd.md > Browser Control Ownership and Handoff`.
- **Crash-time control and safe resumption:** Attempt bounded browser recovery up to twice within execution budgets. A User-Control crash keeps autonomous Agent execution suspended and restores User Control after successful recovery; explicit Return Control to Agent is required before Agent continuation. A Handoff-Pending crash cancels the incomplete handoff and recovers into Awaiting Control Decision, requiring explicit Take Control or Return Control to Agent. Never silently transfer ownership to the Agent. Agent resumption requires explicit authorization, recovered-session and authorized-localhost validation, current-page inspection, and reconciliation of TODOs and execution history; never blindly replay non-idempotent operations. Exhausted recovery ends as Interrupted with trustworthy partial results preserved and unfinished work clearly incomplete.
- **Internal cancellation:** For application shutdown, critical failures, exhausted budgets, or other terminal runtime conditions, show Terminating when possible and immediately prevent new Agent/AI/browser/verification work. Signal supported request cancellation and allow only bounded safe completion of in-flight browser operations under a short configurable cleanup deadline, without budget bypass or blind interruption/replay of potentially non-idempotent work. Record actual observed outcomes or Unknown/Interrupted, then clean up browser/Agent resources and temporary secrets without indefinite waiting; retain securely stored provider credentials. Save trustworthy partial Interrupted results with the recorded termination reason and clearly incomplete verification. Incrementally persist audit events and recover incomplete persisted sessions on next launch for read-only inspection without automatic execution, uncertain-operation replay, or invented evidence/cleanup success. Internal cancellation adds no user-facing execution controls.
- **Session integrity:** Progress, structured questions/answers, TODOs, browser events, evidence, and findings stay synchronized to the current audit. Distinguish User/manual actions from Agent/Playwright execution; manual interaction is not automatically verified Agent evidence. Action claims remain grounded in actual execution.
- **Persistence:** Local projects, audit sessions, reports, and linked evidence.
- **Saved-session lists:** Each project shows a compact list with a concise goal-derived title, final status, local start date/time, available recorded duration, separate Verified/Suspected counts, UX Observation count when space allows, and a safe short blocking/interruption reason when applicable. Sort by start time newest first with stable session ID tie-breaking; viewing or report updates never reorder entries. Clicking opens the saved read-only Audit Overview without execution restart or disruption of another audit. Show an elegant empty state when no sessions exist; preserve finding classifications and exclude sensitive inputs/raw credentials from every preview field.

### Finding Verification Contract

| Category | Meaning |
| --- | --- |
| **Verified Finding** | A reproducible issue supported by real browser execution, sufficient evidence, and a clear mismatch between traceable expected behavior and observed behavior. |
| **Suspected Finding** | A potential issue supported by observations but lacking sufficient evidence, a reliable expectation, or successful independent reproduction. |
| **UX Observation** | A usability concern or improvement suggestion that is not necessarily a functional defect. |

A Verified Finding requires all of the following:

- Actual Playwright execution demonstrating the issue.
- Documented expected and observed behavior, with a traceable source for the expectation: user-provided requirements, an explicit acceptance criterion, or a deterministic application contract.
- Linked screenshots, executed steps, and browser state sufficient to support the conclusion; DOM snapshots, console errors, or network failures when relevant.
- At least one successful independent reproduction attempt, performed when safe and feasible. If reproduction cannot be safely attempted or does not succeed, the finding remains unverified.
- Checks for timing issues, navigation delays, test-environment failures, and incorrect test inputs as potential false positives.
- An explanation of why the actual evidence supports the conclusion, including remaining limitations.

Every finding includes a title and description, category/verification status, severity, evidence-grounded confidence, expected versus actual behavior, reproduction steps, linked evidence artifacts, suggested fix, and relevant limitations or uncertainty. Expected behavior that cannot be established is explicitly identified as such. Confidence is separate from verification status; no complex scoring system is needed.

Incomplete evidence, failed reproduction, or unreliable expectations require downgrading to Suspected Finding or UX Observation as appropriate. All evidence comes from actual tool execution; an LLM may analyze evidence but cannot fabricate it or substitute reasoning for verification. The pipeline remains application- and workflow-independent.

### Preserved Architecture and Stack

Local-first desktop architecture with no FlowProof AI authentication or user accounts, hosted backend, or cloud database. API keys use secure OS-backed storage. Audits can run without creating a FlowProof AI account.

The approved stack remains: Electron; React 19 + TypeScript + Vite; Tailwind CSS 4 + shadcn/ui; Zustand + TanStack Query; Node.js agent runtime; Playwright; Vercel AI SDK; SQLite + Drizzle ORM; Pino; electron-builder; Vitest.

## Later

- Cross-platform distribution beyond Windows 11 x64.
- Additional browser engines and broader browser-session/tab support.
- Concurrent audits and multi-agent execution.
- Target environments beyond localhost, with appropriate authorization boundaries.

Keep the architecture extensible for broader targets and user-defined flows while delivering the bounded workflow above first.

## Explicitly Cut

- **Hosted backend, cloud database, and cloud infrastructure:** the product's runtime and persistence are local-first.
- **FlowProof AI authentication and user accounts:** account-free BYOK is a fixed product decision.
- **Sign-in-specific execution logic and a fixture-first implementation:** the application is built first, and the later fixture validates the reusable audit loop.
- **Complex scoring systems and unnecessary verification infrastructure:** prioritize a small, genuinely working evidence-and-reproduction pipeline.
- **Two-way free-form chat, a persistent composer, and unsolicited audit-goal instructions:** structured `ask_user` and the explicit browser-control handoff are the permitted execution-affecting interactions.
- **Generic Pause/Resume/Stop, audit-goal redirection, and uncoordinated or simultaneous browser control:** autonomous Agent ownership is the default; direct User browser input requires explicit exclusive handoff and never bypasses security policy.
- **Screenshot-streaming substitutes and duplicate hidden automation browsers:** the live experience must use the exact native embedded session controlled by Playwright. Screenshots remain valid evidence artifacts, not the live rendering mechanism. Mandatory 4-spec feasibility validation must establish a safe compatible approach before implementation.
- **Simulated execution, fabricated evidence, and unsupported verification claims:** the core promise depends on traceable real actions and conservative classification.
