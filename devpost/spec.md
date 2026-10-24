---
doc: spec
status: approved
---

# FlowProof AI — Hackathon Technical Spec

**Approved technical specification · 2026-10-24.** The learner explicitly approved this simplified specification and authorized official `5-build`. `4-spec` is complete. Preserve the approved product and stack; implement a small complete workflow using the demonstrated WebContentsView + CDP + Playwright integration provisionally. Broad pre-build feasibility campaigns are replaced by focused development checks. Build progress is recorded in [checklist.md](checklist.md).

## How This Works, In Plain Language

FlowProof is one Windows desktop app. You connect your AI provider, enter an authorized localhost URL and goal, and watch an agent test the real page displayed inside the workspace. The agent updates TODOs, asks structured questions when necessary, captures real evidence, and saves findings locally. Playwright does the browser/UX testing; optional WebMCP tools help only when they suit the task and pass the same permission checks.

Use the working native browser integration as the starting point. Build one useful slice at a time, fix actual blockers, and disclose unsupported behavior. No cloud backend, extra agent platform, generic chat interface, or additional browser architecture is needed.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`, `New Audit Setup and Preflight`, and `Local Projects, Sessions, and Reports`.

1. **Launch:** Electron opens the premium off-white workspace and reads local projects/settings. Incomplete prior audits become read-only Interrupted records; they never restart.
2. **Connect AI:** The user selects OpenAI, Anthropic, Gemini, or OpenRouter and enters a model ID/key. A small tool-capability request checks the configuration; the main process encrypts the key with Windows-backed safeStorage.
3. **Configure:** New Audit collects project, fixed localhost host with port/path, goal, optional description, budgets and fresh unchecked authorization. Non-sensitive draft restoration clears consent and stale preflight results.
4. **Start:** Revalidate provider, target, consent, budgets and the single-active-audit guard. Only then create the audit record, native guest, scoped connection and Agent worker.
5. **Execute:** The worker plans and calls typed tools. The main process serializes browser operations, checks ownership/permissions, records actual outcomes and streams safe events/TODO updates to the UI.
6. **Ask / hand off:** Structured questions wait for validated answers or supported Skip. Explicit Take/Return Control serializes User/Agent input; fresh inspection precedes Agent continuation.
7. **Verify:** A candidate finding gets traceable expected behavior, observed evidence, a safe independent Playwright reproduction and false-positive checks. Missing proof stays Suspected or UX Observation.
8. **Review:** Persist the final Completed/Blocked/Interrupted result. Reopen its read-only overview, finding classifications, TODOs, events and evidence locally, including after restart.

## Stack and Process Layout

| Piece | Implementation choice |
| --- | --- |
| Desktop/browser | [Electron 45.0.0](https://www.electronjs.org/docs/latest/), Windows 11 x64; one BrowserWindow workspace plus one native audit [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view) and trusted input shield |
| Automation | [Playwright Core 1.64.1](https://playwright.dev/docs/library), authenticated guest-scoped CDP bridge, partition-bound cookie adapter; reuse demonstrated mechanisms |
| UI | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), [Vite](https://vite.dev/guide/) with [electron-vite](https://electron-vite.org/guide/) build tooling, [Tailwind CSS 4](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs) |
| UI state | [Zustand](https://zustand.docs.pmnd.rs/) for current view/layout; [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for main-process queries/mutations |
| Agent | Node runtime in one [Electron utility process](https://www.electronjs.org/docs/latest/api/utility-process); [AI SDK ToolLoopAgent](https://ai-sdk.dev/docs/agents/building-agents) with typed tools and a bounded loop |
| Local records | [SQLite](https://www.sqlite.org/docs.html), [Drizzle](https://orm.drizzle.team/docs/get-started-sqlite) with better-sqlite3; main process owns the database |
| Diagnostics/release | [Pino](https://getpino.io/) safe structured logs, [Vitest](https://vitest.dev/guide/) targeted tests, [electron-builder](https://www.electron.build/) Windows x64 folder/installer |

Start from the tested browser pair. Initial AI SDK pins researched for this draft: `ai@7.0.152`, `@ai-sdk/openai@4.0.101`, `@ai-sdk/anthropic@4.0.87`, `@ai-sdk/google@4.0.104`, `@ai-sdk/openai-compatible@3.0.77`. Lock remaining compatible patch versions during the first build slice; check installed types before using SDK APIs. Zod validates shared contracts; [Ajv](https://ajv.js.org/) validates external WebMCP JSON inputs without remote schema loading. No library/version survey blocks development.

```text
Trusted React UI → narrow preload IPC → Electron main
                                         ├─ SQLite, evidence files, encrypted keys
                                         ├─ native guest + ownership/policy broker
                                         └─ one Node Agent worker ↔ selected BYOK provider
                                                   └─ typed tool requests → main broker
Native guest ← scoped CDP + Playwright ← main broker
                         └─ optional page.webmcp, same page and permission path
```

## Components

### Desktop Host and Trusted Workspace

Implements `prd.md > Workspace Layout and Observation UI`, `Project Navigation During an Active Audit`, `Screens and Layout`, and `Look and Feel`.

The main process owns application lifetime, database, active-audit guard and native views. The sandboxed workspace gets a narrow preload API, never raw Electron or CDP. Validate IPC sender, audit IDs and Zod payloads. React reports the browser slot rectangle through ResizeObserver; the host clamps native bounds to its content area. Hide the guest when showing saved content/overlays; keep execution independent with the demonstrated scheduling settings.

Keep the established sidebar, approximately 60/40 feed/supporting-panel split, native preview above TODOs, resize/enlarge controls, contextual findings and global audit/question indicator. Use warm `#F7F6F2` surfaces, dark neutral text, restrained olive accents, system Segoe UI typography, 8px spacing rhythm and short reduced-motion-aware transitions. Technical detail is collapsed; saved-session lists and overviews stay compact and read-only. No persistent composer or generic Pause/Resume/Stop.

### Native Browser, Session and Ownership

Implements `prd.md > Real Live Browser Preview`, `Browser Control Ownership and Handoff`, and `Browser Failure Detection and Automatic Recovery`.

Adapt the lab's host/bridge/coordinator into application modules; do not copy its fixed diagnostic route catalog or bootstrap RPCs as product APIs. Use one non-persistent audit partition and exact target-ID mapping, not `pages[0]`. Retain sandbox, context isolation, no guest Node/preload privileges, webSecurity, denied popups/downloads/device permissions, partition cookie adapter, loopback bearer-authenticated guest-only CDP and per-generation revocation. Strip unrestricted debugging switches. Only the trusted broker holds Playwright/raw protocol access.

Agent owns the guest initially. One operation lease is active at a time. Take Control immediately excludes new work and holds the shield until bounded completion; User control suspends browser-dependent Agent work. Return removes manual input, validates URL/identity, reads current DOM/session and reconciles TODO/history before resuming. Unknown outcomes stay unknown, retain exclusion and are never replayed. Questions, view changes and recovery cannot silently reclaim User ownership. Add input/focus fixes only when real product testing needs them; broader hardware coverage remains a disclosed limitation.

### Agent Runtime and Structured Questions

Implements `prd.md > Autonomous Agent Activity Feed`, `Dynamic TODOs`, `Structured Clarifications Through ask_user`, and `Autonomous Execution and Internal Cancellation`.

One utility-process worker runs ToolLoopAgent with the selected model and typed tools. Stream progress/tool/result events, not hidden reasoning. The main process is authoritative for execution, permissions and durable events; a UI view switch never owns the worker lifecycle. Serialize tool execution even when a model proposes parallel calls.

Tools: `inspect_page`, `navigate`, `click`, `fill`, `select`, `press`, `scroll`, `wait_for`, `capture_evidence`, `update_todos`, `ask_user`, `propose_finding`, and optional `list_webmcp_tools` / `call_webmcp_tool`. Locator arguments are typed role/label/test-id/selector descriptions; do not expose arbitrary JavaScript, shell, filesystem or unrestricted HTTP tools to the model. Trusted helpers may evaluate fixed inspection code internally.

`ask_user` carries `{id, kind, prompt, options?, required, min?, max?, format?, inputType, allowSkip}`. Validate answers in UI and main. Dismissal leaves the question pending; supported Skip is a distinct outcome with safe-alternative/Blocked handling. Approve/Deny bind to an exact eligible operation. Secret input returns an ephemeral opaque reference to authorized execution, never a raw model-visible value; consume/discard it and persist safe metadata only. Keep the established five TODO states and separate audit/ownership/action-outcome states.

### Shared Authorization and Action Policy

Implements `prd.md > Target Authorization and Browser Boundaries`, `Risk-based Action Permissions`, and `Sensitive Input Lifecycle`.

All Playwright and WebMCP calls pass the same main-process policy/lease path. Bind the audit to parsed `http://localhost:<port>` and authorized scope; path entry cannot replace the origin. Native navigation/session request guards and popup denial apply during both owners' control. Provider HTTPS traffic uses the trusted provider adapter, not guest browsing permissions.

Understood goal-scoped low-risk actions can run; eligible meaningful/uncertain effects require structured approval; real financial transactions, irreversible destruction and other hard restrictions stay blocked. A pending grant includes audit ID, browser/document generation, action/tool identity, exact arguments and affected resources; consume once and invalidate on change/navigation/recovery. Page text, WebMCP annotations and a GET method are not proof of safety. If effects cannot be bounded sufficiently, skip the action rather than treat approval as a universal override.

Use conservative tool checks plus the guest's native request gate for recognized risky/uncertain requests, including during User control. Do not invent a universal classifier for arbitrary backend effects; disclose what cannot be established. Unknown requests/actions must not silently execute as low risk. Preserve low-risk forms when their effects are understood, rather than requiring approval for every form. Test these essential paths on the actual app during development; unsupported safety-critical behavior is a real blocker to that action, not a reason for an open-ended research program.

### Optional Experimental WebMCP Adapter

Implements the learner's 2026-10-24 additive tool-strategy decision alongside `prd.md > Evidence-Backed Findings` and `Risk-based Action Permissions`.

**Measured: works in the existing packaged embedded session.** With `--enable-features=WebMCP`, Playwright 1.64.1 discovered and called an owned tool; an independent native read observed marker `42`. A normal Playwright action and a page with no tools both worked afterward. No bridge/embedding change was needed. [Bounded report](feasibility/runs/2026-10-24T15-35-34-179Z-webmcp.json); [reproduction tool](feasibility/browser-lab/tools/webmcp-probe.cjs). This Chromium exposes `document.modelContext`, while `navigator.modelContext` is absent: do not use the latter alone as the capability test.

- Enable the experimental browser feature. On each main-frame document, call public `page.webmcp.tools({timeout: 1500})`; refresh once before a proposed invocation. States are Available / No tools / Unavailable. Catch absence/errors and continue with Playwright without requiring website changes or repeated retries.
- Use public `page.webmcp.callTool(name, validatedInput, {timeout: 15000})` only through the shared policy/ownership broker. Keep main-frame scope for the POC. Bound discovery to 20 tools, descriptions to 2,000 characters and total metadata to 64KiB; reject malformed/oversized schemas or unknown names.
- Treat names, descriptions, schemas, hints and outputs as untrusted data, never system instructions or safety grants. Validate JSON inputs, cap/sanitize results, record tool identity/source and independently inspect actual effects. Clear stale discovery on navigation/recovery.
- Use tools for appropriate structured auxiliary actions, not to skip UI interactions the goal is testing. Sign-in feedback, navigation usability, labels, validation and similar UX checks use actual Playwright interaction. Tool output alone cannot verify a UI defect.
- A timeout/throw after invocation may have side effects: record Unknown and inspect/reconcile before any alternative. Do not automatically retry or redo the same action through Playwright. Discovery failure before invocation is safe ordinary fallback.
- If a later runtime update breaks this optional adapter, mark it Unavailable and defer it; keep the core browser workflow working.

### Evidence, Findings and Local Reports

Implements `prd.md > Evidence-Backed Findings`, `Contextual Findings and Dedicated Findings View`, `Read-only Audit Overview`, and `Local Projects, Sessions, and Reports`.

Record action start before dispatch and the independently observed result afterward. Evidence includes safe screenshot/DOM observations and relevant console/network summaries linked to actual tool-event IDs. Mask known sensitive elements; omit artifacts that cannot be safely retained. Do not persist raw credentials, cookies, request bodies or unsanitized tool/provider errors. Pino logs IDs/status/error codes with redaction, not full prompts/arguments.

The model proposes findings; trusted validation assigns Verified only with a traceable expectation source, observed mismatch, sufficient linked evidence, safe independent Playwright reproduction and timing/input/environment checks. Manual participation and WebMCP results stay attributed and cannot replace that gate. Otherwise retain Suspected Finding or UX Observation with uncertainty. Store title, description, class, severity, confidence, expected/actual, steps, evidence references, suggested fix and limitations. Reports are a local read model from recorded data, with separate classification counts, actual progress and coverage limits; never fabricate summaries/metrics.

### Providers and Credentials

Implements `prd.md > New Audit Setup and Preflight`, `Provider Connectivity and Automatic Recovery`, and `Sensitive Input Lifecycle`.

Use direct BYOK adapters, with an editable model ID and tool-capability preflight; unsupported models fail setup with an actionable message. Keep all four provider integrations, but record live validation only for providers whose user-supplied keys are available. No automatic provider/model switching.

| Provider / adapter | HTTPS request and credentials | Response consumed |
| --- | --- | --- |
| [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai), `createOpenAI(...).chat(modelId)` | `POST https://api.openai.com/v1/chat/completions`, Bearer key; model, messages, tool schemas, bounded output, streaming | choices/delta text and tool_calls; finish_reason; usage when supplied |
| [Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), `createAnthropic` | `POST https://api.anthropic.com/v1/messages`, x-api-key/version headers through SDK; model, system/messages, tools, max_tokens, streaming | content-block text/tool_use and input JSON deltas; stop reason; usage |
| [Gemini](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai), `createGoogleGenerativeAI` | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`, SDK key auth; contents, systemInstruction, tools, generationConfig | candidates/content parts/text/functionCall; finishReason; usageMetadata |
| [OpenRouter](https://openrouter.ai/docs/api-reference/overview), `createOpenAICompatible` | `POST https://openrouter.ai/api/v1/chat/completions`, Bearer key; model, messages, tools, streaming; include usage when supported | OpenAI-compatible choices/delta/tool_calls; available usage/cost metadata |

All adapters normalize streamed text/tool calls, finish reason and available token usage; validate tool inputs locally. SDKs encode provider wire formats. Pricing, rate limits and availability vary by selected model/account; show unavailable cost/usage explicitly, respect Retry-After and configured budgets. Small preflight requests may incur the provider's ordinary charges. No hosted FlowProof service or gateway account is required.

After Electron is ready, check `safeStorage.isAsyncEncryptionAvailable()`; use `encryptStringAsync` / `decryptStringAsync` and its `result` field. Store only ciphertext in a main-owned file under userData; the renderer gets configured/not-configured status, never saved keys. If OS encryption fails, explain and leave connection setup uncompleted; do not save plaintext. See [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

## Data Model and Communication Contracts

Main owns one SQLite file with foreign keys and migration files. Keep five small tables; typed JSON payloads hold evolving progress instead of creating a subsystem/table per feature.

| Table | Core fields / behavior |
| --- | --- |
| `projects` | UUID, name, description, createdAt; created only when a valid audit starts |
| `audits` | UUID, projectId, sanitized title/goal/target, provider/model snapshot, phase, finalStatus?, startedAt, endedAt?, budgets JSON, progress JSON, safe terminal reason/summary; one non-terminal audit enforced transactionally |
| `events` | auditId + monotonically increasing seq, timestamp, kind, actor (`agent/user/system`), safe versioned payload JSON; append actual progress/tool/question/TODO/ownership/usage/evidence events |
| `findings` | UUID, auditId, complete finding fields, expectation/reproduction/event/evidence references; validated classification, frozen at finalization |
| `settings` | key + safe JSON: selected provider/model, layout and non-sensitive draft; never raw keys, consent or secret responses |

`userData/flowproof.sqlite` stores metadata; `userData/evidence/<auditId>/<artifactId>.<ext>` stores sanitized artifacts with relative path/hash/type recorded in events; encrypted provider keys live separately. Evidence queries accept recorded artifact IDs, not arbitrary filesystem paths. Temporary audit cookies and secret-reference maps stay in memory. Normal accepted answers may persist; secret answers retain metadata only. Reopening a project reads saved records; it never starts execution. Sort sessions by startedAt descending with stable ID tie-break, not last viewed. Failed persistence stops further execution and preserves available truthful partial results.

Shared Zod/TypeScript contracts:
- Commands: `{requestId, type, payload}` for provider save/test, setup draft save/read, preflight/start, question answer/skip, Take/Return Control, view rectangle/visibility and history/evidence queries. Current authorization is memory-only and revalidated on start. Replies are `{requestId, ok, data? , error?: {code, safeMessage}}`.
- Worker ↔ main: start/cancel/question-resolution and typed tool requests/results; no arbitrary method names or raw CDP from model output. Match audit/generation/request IDs and reject stale work.
- UI events: `{auditId, seq, at, type, safePayload}`. Subscribe once through preload, persist before publication, deduplicate by seq and fetch missed events/snapshot on return. UI layout state never becomes audit authority.

## Execution Limits and Important Failure Modes

Implements `prd.md > Audit Outcomes and Coverage Limits`, `Autonomous Execution and Internal Cancellation`, and the provider/browser recovery behaviors.

Approved POC defaults: **40 model steps, 10-minute wall-clock audit budget, 15-second browser/WebMCP action timeout, 45-second model request timeout, 5-second shutdown/cleanup deadline**. Budget time includes questions/User control; expose elapsed/remaining time. Optional token/cost caps apply when measurable, with no invented prices. Check limits before model requests, tools and recovery; unknown-cost models still have step/time limits.

- **Provider interruption:** Preserve state, show Reconnecting, retry only the failed model request up to three times with bounded 1/2/4-second backoff plus jitter/Retry-After within budget. One retry owner prevents SDK retries multiplying this limit. Invalid keys/quota/model errors do not retry. Never replay completed tools or switch providers. Exhaustion ends Interrupted.
- **Browser failure / uncertain action:** Exclude further browser work; mark unavailable/Unknown accurately. Attempt at most two target recreations, invalidate old handles/grants, inspect actual state and rebind the same displayed session. Restore User ownership after a User crash, or Awaiting Control Decision after pending-handoff crash; require explicit Return and checks before Agent continuation. If safety cannot be re-established, end Interrupted with partial results.
- **Questions / permissions:** Await valid answers; approval is exact and one-use, Skip is distinct, denial/hard restriction seeks a safe alternative. No safe continuation means Blocked with its actual reason. Never call an unsafe operation to finish a demo.
- **Shutdown / worker / storage failure / budget exhaustion:** Enter Terminating when possible, prohibit new work, cancel supported requests, allow only bounded in-flight completion and record Unknown if unestablished. Save Interrupted, close guest/worker, discard temporary secrets. On next launch finalize incomplete records for inspection without execution or claims that forced cleanup succeeded.

## Planned File Structure

```text
FlowProof-AI/
  package.json / package-lock.json  # dev, build, typecheck, test, package scripts
  electron.vite.config.ts           # main, preload, renderer; worker as explicit main entry
  electron-builder.yml              # Windows x64, ASAR, native SQLite rebuild/packaging
  tsconfig*.json / vitest.config.ts # build/type boundaries and focused tests
  src/
    main/
      index.ts                     # startup, window, shutdown
      ipc.ts                       # validated workspace commands/events
      browser/{host,cdp-bridge,session,ownership}.ts # adapt working native integration
      browser/{tools,policy,webmcp}.ts # bounded actions, shared gates, optional adapter
      runtime/{audit,preflight,budgets,questions}.ts # single audit, waiting and termination
      agent-worker.ts              # utility-process entry; SDK loop and provider adapter
      providers.ts                 # four BYOK clients, normalization and request retry
      {credentials,evidence,verifier,reports}.ts # secrets, artifacts, findings, read models
      db/{index,schema}.ts          # SQLite/Drizzle; main is the sole owner
      db/migrations/               # versioned schema changes
    preload/index.ts               # narrow typed contextBridge API
    shared/{contracts,types}.ts     # Zod schemas, states and safe messages
    renderer/
      index.html / main.tsx / App.tsx / styles.css
      components/{Workspace,Sidebar,ActivityFeed,BrowserSlot,TodoPanel,QuestionCard}.tsx
      components/{NewAudit,Settings,Findings,AuditOverview}.tsx
      components/ui/               # only needed shadcn primitives
      {api,store}.ts               # preload query hooks and layout/navigation state
  tests/                           # policy/ownership/question/budget/verifier tests
  fixtures/sign-in/                # added later; seeded defect + explicit expectation
  devpost/                         # approved plans, archived observations, build checklist later
```

## Where It Runs and How Someone Tries It

Windows 11 x64, Node 24-compatible development tooling and a BYOK account. These are **commands the first build slice must supply**, not a claim the app already exists:

```powershell
npm ci
npm run dev          # build/watch main + preload + renderer; launch Electron
npm run typecheck
npm test             # focused Vitest suite
npm run build
npm run package:win  # electron-builder; include worker and rebuild native SQLite
```

Run `dist/win-unpacked/FlowProof AI.exe` with its sibling files for the smoke test; produce an unsigned Windows installer for sharing when the core works. No developer-installed Node should be needed for the packaged Agent: utilityProcess runs the bundled worker. Native-module packaging is ordinary build work, fixed if it blocks launch. Retain established fuse settings; signing/updater/integrity-enforcement work is deferred.

After the app works, add the small React sign-in fixture and its `npm run fixture` command serving `http://localhost:3000`. Demonstrate real BYOK → goal → autonomous UI actions/TODOs → question if needed → seeded defect with explicit expected feedback → safe independent reproduction → truthful report → restart/reopen. Include a no-WebMCP target; an optional benign WebMCP demonstration must not replace the UI audit. Deliver a short demo video and public GitHub repository; hosting is optional.

## Focused Build Order and Done Criteria

1. **Launchable shell:** Electron, typed preload, native guest and real Playwright interaction visible; package the shell/worker early to catch distribution blockers.
2. **Local setup:** database, encrypted credentials, all four provider adapters, preflight/draft/single-audit guard; a real configured provider completes tool-capability preflight.
3. **Autonomous run:** bounded SDK loop, serialized browser tools, actual feed/TODO events and validated `ask_user`; working Take/Return ownership and essential origin/policy enforcement.
4. **Evidence and report:** real sanitized artifacts, conservative verification, terminal outcomes and read-only local history after restart.
5. **Optional WebMCP:** thin discovery/call adapter through existing gates; no-tools/unsupported fallback, visible-UX preservation and honest attribution. Defer any adapter blocker without blocking Playwright.
6. **Acceptance/demo:** add the sign-in fixture later; run the end-to-end workflow, a denied/out-of-scope action, secret-output check and bounded failure/Interrupted smoke. Package, record the demo and prepare repository/submission in `6-ship`.

Use small Vitest tests for policy, ownership, questions, budgets and verification; use a few actual Electron/Playwright smoke paths for the kernel and packaged launch. No new exhaustive input/worker/CDP/security matrices or prerequisite broad feasibility sign-off. Report missing live-provider/hardware coverage honestly; fix actual core/security blockers as encountered.

## What Was Simplified and Why

- Adopt the demonstrated browser mechanism provisionally; keep [checkpoint 2](spec-checkpoint-2.md) and [raw evidence](browser-feasibility-results.json) as historical support rather than the active work queue. Historical INCONCLUSIVE results remain inconclusive.
- One Agent worker, one typed event stream, five local tables and direct BYOK calls. No event bus service, plugin system, hosted backend, multi-agent orchestration or production policy-contract framework.
- Basic approved recovery/budget/secret rules remain; defer exhaustive races, broad OOPIF/worker compatibility, hardware/IME/DPI campaigns, long-duration performance, signed release/updater and advanced ASAR hardening.
- Keep four provider integrations and the complete essential user journey. Implement each minimally before visual edge-case polish. The actual browser, autonomous execution and evidence-based verification are real, never simulated.

## Decisions and Open Issues

- **Learner direction:** Small impressive working POC, fixed product/stack, provisional WebContentsView + CDP + Playwright, optional untrusted WebMCP with normal fallback, no further broad pre-build campaigns.
- **Uncertainty resolved:** Same displayed target and optional WebMCP discovery/invocation worked in the actual packaged host. This build exposes document.modelContext; version labels or navigator checks alone would have been misleading.
- **Approved implementation blueprint:** The learner approved the process/file/data contracts, build tooling, initial SDK pins and numeric defaults in this simplified specification. No provider credentials were requested/used during planning; live provider results belong to development.
- **Known limitations:** Arbitrary backend effects cannot be universally inferred from page labels, methods or tool hints; prevent unbounded unsafe actions and disclose coverage. Full CDP/hardware/release-hardening coverage is deferred, not reported as passed. Tool/protocol problems get focused fixes only when they block the chosen core path.
- **Approval and handoff:** The learner explicitly approved this specification and requested official `5-build`; `4-spec` is complete. Follow the approved implementation sequence with verified working slices. Begin `6-ship` only after the core application passes a real end-to-end acceptance test and the build's final hands-on review/wrap-up are complete. No product implementation is claimed by this approval record.
