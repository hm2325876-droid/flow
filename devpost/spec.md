---
doc: spec
status: approved
---

# FlowProof AI — Hackathon Technical Spec

**Approved technical specification · 2026-10-24.** The learner explicitly approved this simplified specification and authorized official `5-build`. `4-spec` is complete. Preserve the approved product and stack; implement a small complete workflow using the demonstrated WebContentsView + CDP + Playwright integration provisionally. Broad pre-build feasibility campaigns are replaced by focused development checks. Build progress is recorded in [checklist.md](checklist.md).

**Approved architecture amendment:** Use the npm Workspaces monorepo and process/package ownership below. This amendment records the completed architecture discussion; it does not authorize implementation. Slice 1, source directories, manifests, dependency installation and `6-ship` remain paused until explicit authorization.

## How This Works, In Plain Language

FlowProof is one Windows desktop app. You connect your AI provider, enter an authorized localhost URL and goal, and watch an agent test the real page displayed inside the workspace. The agent updates TODOs, asks structured questions when necessary, captures real evidence, and saves findings locally. Playwright does the browser/UX testing; optional WebMCP tools help only when they suit the task and pass the same permission checks.

Use the working native browser integration as the starting point. Build one useful slice at a time, fix actual blockers, and disclose unsupported behavior. No cloud backend, extra agent platform, generic chat interface, or additional browser architecture is needed.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`, `New Audit Setup and Preflight`, and `Local Projects, Sessions, and Reports`.

1. **Launch:** Electron opens the premium off-white workspace and reads local projects/settings. Incomplete prior audits become read-only Interrupted records; they never restart.
2. **Connect AI:** The user selects OpenAI, Anthropic, Gemini, or OpenRouter and enters a model ID/key. Main supplies credentials privately to AI Providers in its supervised Utility process for the small tool-capability check; Main encrypts the saved key with Windows-backed safeStorage.
3. **Configure:** New Audit collects project, fixed localhost host with port/path, goal, optional description, budgets and fresh unchecked authorization. Non-sensitive draft restoration clears consent and stale preflight results.
4. **Start:** Revalidate provider, target, consent, budgets and the single-active-audit guard. Only then create the audit record/native guest and supply the authorized session descriptor to the Utility process; Agent Core starts autonomous execution there.
5. **Execute:** Agent Core plans, manages TODOs/questions and requests browser operations. Browser Runtime in Utility serializes and executes Playwright/WebMCP actions against Main's guest through authorized leases. Main enforces native/privileged boundaries, persists validated outcomes and relays safe events to the UI.
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
| Workspace organization | [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), one root `package.json` coordinating `apps/*` and `packages/*`, and one root `package-lock.json` |
| Agent | Agent Core, Browser Runtime and AI Providers execute in one [Electron Utility Process](https://www.electronjs.org/docs/latest/api/utility-process); [AI SDK ToolLoopAgent](https://ai-sdk.dev/docs/agents/building-agents) supplies the bounded model/tool loop |
| Local records | [SQLite](https://www.sqlite.org/docs.html), [Drizzle](https://orm.drizzle.team/docs/get-started-sqlite) with better-sqlite3 in `packages/persistence`; storage executes only under Main ownership |
| Diagnostics/release | [Pino](https://getpino.io/) safe structured logs, [Vitest](https://vitest.dev/guide/) targeted tests, [electron-builder](https://www.electron.build/) Windows x64 folder/installer |

Start from the tested browser pair. Initial AI SDK pins researched for this draft: `ai@7.0.152`, `@ai-sdk/openai@4.0.101`, `@ai-sdk/anthropic@4.0.87`, `@ai-sdk/google@4.0.104`, `@ai-sdk/openai-compatible@3.0.77`. Lock remaining compatible patch versions during the first build slice; check installed types before using SDK APIs. Zod validates shared contracts; [Ajv](https://ajv.js.org/) validates external WebMCP JSON inputs without remote schema loading. No library/version survey blocks development.

```text
React Renderer ↔ typed Preload IPC ↔ Electron Main
                                      ├─ windows, lifecycle, native guest + input shield
                                      ├─ persistence package + secure credentials
                                      └─ validated IPC ↔ supervised Utility Process
                                                           ├─ Agent Core: orchestration
                                                           ├─ AI Providers ↔ BYOK APIs
                                                           └─ Browser Runtime: Playwright
                                                                + optional WebMCP
Browser Runtime ↔ authenticated scoped CDP ↔ Main-owned native guest
```

## Approved Workspace Architecture

The only application workspace is `apps/desktop`. The five shared packages are `contracts`, `agent-core`, `browser-runtime`, `ai-providers` and `persistence`. They are code organization boundaries, not five additional processes or services. Keep the existing stack and lightweight npm scripts; do not introduce an alternative package manager, task-orchestration platform or extra workspace without a concrete requirement.

Use one root install and lockfile. When implementation is authorized, each named npm workspace will need its own small `package.json` declaring its name/exports/dependencies; these are workspace manifests, not additional root manifests or independent lockfiles. No manifest or source directory is created by this documentation amendment.

### Process Ownership

| Process / entry | Owns | Must not own / access |
| --- | --- | --- |
| Electron Main, `apps/desktop/src/main` | Windows/application lifecycle; native WebContentsView/session/shield; Utility supervision; SQLite/evidence/report access through Persistence; OS-backed credential storage; privileged IPC authorization and native browser security boundaries | Business-level planning, TODO/question orchestration or Playwright execution |
| Electron Preload, `apps/desktop/src/preload` | Minimal typed, validated Renderer ↔ Main bridge | General Node/Electron exposure, provider clients, SQLite or CDP |
| React Renderer, `apps/desktop/src/renderer` | Premium UI, onboarding, sidebar, feed, TODOs, browser workspace, findings/reports and navigation/layout state | Direct SQLite/storage implementations, saved provider keys, Node privileges or browser debugging interfaces |
| Electron Utility, `apps/desktop/src/utility` | Composition/hosting of Agent Core, Browser Runtime and AI Providers; autonomous execution independent of Renderer; validated Main IPC | Electron native-view ownership, direct SQLite/evidence-file access or secure-store access |

### Package Boundaries and Allowed Dependencies

Workspace names below are the intended npm names. Dependencies mean imports of workspace code; process-crossing access always uses validated contracts rather than importing another entry point.

| Workspace / consumer | Responsibility | Allowed workspace imports |
| --- | --- | --- |
| `@flowproof/contracts` | Shared TypeScript types, runtime schemas, plain IPC DTOs, ports and audit events; platform-neutral | None |
| `@flowproof/agent-core` | Audit orchestration/planning, execution lifecycle/budgets, TODO management, structured `ask_user`, evidence verification and finding classification | Contracts; receive browser/model/persistence capabilities as injected ports, not concrete workspace imports |
| `@flowproof/browser-runtime` | Playwright/CDP client connectivity, browser tools, evidence capture/sanitization and optional WebMCP; runs in Utility against Main's authorized guest only | Contracts |
| `@flowproof/ai-providers` | Four BYOK providers, model selection, SDK model construction and bounded model-request handling; runs in Utility | Contracts |
| `@flowproof/persistence` | SQLite/Drizzle repositories/migrations and local report/evidence storage implementations; called only under Main ownership, not a process | Contracts |
| Desktop Main | Native/security/supervision/credential composition and Persistence service endpoints | Contracts, Persistence |
| Desktop Preload / Renderer | Typed UI bridge and UI; no privileged implementations in either bundle | Contracts |
| Desktop Utility | Compose concrete runtime/providers with Agent Core ports and Main IPC adapters | Contracts, Agent Core, Browser Runtime, AI Providers |

Shared packages must not import `apps/desktop`, another package's private source files or form cycles. Import public workspace exports. Approved external dependencies remain where used: AI SDK in Agent Core/AI Providers, Playwright/Ajv in Browser Runtime, SQLite/Drizzle in Persistence and UI libraries in Renderer. Contracts does not import Electron, SQLite, provider clients or Node-only implementations. Utility receives persistence/credential capabilities through Main IPC; it never imports Persistence to bypass that boundary.

### Authorized Communication Paths

1. **UI:** Renderer → Preload → Main for setup/start, question/control responses, layout and saved-content queries; Main → Preload → Renderer for validated replies/events. No direct Renderer → Utility, package runtime, provider API or CDP connection.
2. **Execution:** Main supervises Utility and sends a validated audit/session descriptor (audit ID, allowed origin/scope, generation and scoped connection capability). Agent Core invokes injected Browser/Model/Main-storage ports; its business orchestration stays out of Main.
3. **Browser:** Browser Runtime in Utility obtains a Main-authorized ownership/action lease, then uses Playwright's CDP connection to the exact Main-owned native guest. Main gates privileged transport/native requests and lifecycle; recovery revokes stale descriptors/grants. CDP is the approved constrained browser transport, not a general IPC escape hatch.
4. **Storage and secrets:** Utility → validated Main service requests → Persistence/secure store. Browser Runtime captures/sanitizes evidence; Main alone writes artifacts/SQLite and returns recorded IDs. Main supplies provider credentials privately to Utility/AI Providers when needed; secret-reference resolution is limited to an authorized Browser Runtime action. Saved keys and raw secret results never return to Renderer, logs or model-visible tool results.
5. **Events:** Agent Core emits typed business events through Utility → Main, which validates, persists through Persistence and relays safe events. Main also emits native ownership/lifecycle/security events. `contracts` defines both directions and identifiers; it is not an event-bus process.

All paths preserve one active audit and one isolated controlled native browser session/tab. There is no separate hidden automation browser, hosted backend or additional runtime service.

## Components

### Desktop Host and Trusted Workspace

Implements `prd.md > Workspace Layout and Observation UI`, `Project Navigation During an Active Audit`, `Screens and Layout`, and `Look and Feel`.

`apps/desktop/src/main` owns application/native lifetime, the single-active-audit guard, Utility supervision, privileged authorization and Main-only storage/credentials. It imports Persistence implementations rather than hosting business orchestration. `src/preload` supplies the minimal typed bridge; `src/renderer` owns the UI and imports only Contracts among shared workspaces. Validate IPC sender, audit IDs and Zod payloads; no direct Renderer SQLite, saved-key, Node or debugging access. React reports the browser slot rectangle through ResizeObserver; Main clamps native bounds. Hide the guest when showing saved content/overlays; Utility execution remains independent of Renderer with the demonstrated scheduling settings.

Keep the established sidebar, approximately 60/40 feed/supporting-panel split, native preview above TODOs, resize/enlarge controls, contextual findings and global audit/question indicator. Use warm `#F7F6F2` surfaces, dark neutral text, restrained olive accents, system Segoe UI typography, 8px spacing rhythm and short reduced-motion-aware transitions. Technical detail is collapsed; saved-session lists and overviews stay compact and read-only. No persistent composer or generic Pause/Resume/Stop.

### Native Browser, Session and Ownership

Implements `prd.md > Real Live Browser Preview`, `Browser Control Ownership and Handoff`, and `Browser Failure Detection and Automatic Recovery`.

Adapt demonstrated native host/bridge/session/ownership mechanisms into `apps/desktop/src/main/browser`; put Playwright attachment, browser tools, capture and optional WebMCP in `packages/browser-runtime`, executing inside Utility. Do not copy the lab's fixed route catalog or bootstrap RPCs as product APIs. Main owns one non-persistent audit partition and exact target-ID mapping, not `pages[0]`. Retain sandbox, context isolation, no guest Node/preload privileges, webSecurity, denied popups/downloads/device permissions, partition cookie adapter, loopback bearer-authenticated guest-only CDP and per-generation revocation. Strip unrestricted debugging switches. Browser Runtime alone holds the trusted Playwright client; only Main holds the native Electron debugger endpoint, and neither is exposed to Renderer or model output.

Agent owns the guest initially. One operation lease is active at a time. Take Control immediately excludes new work and holds the shield until bounded completion; User control suspends browser-dependent Agent work. Return removes manual input, validates URL/identity, reads current DOM/session and reconciles TODO/history before resuming. Unknown outcomes stay unknown, retain exclusion and are never replayed. Questions, view changes and recovery cannot silently reclaim User ownership. Add input/focus fixes only when real product testing needs them; broader hardware coverage remains a disclosed limitation.

### Agent Runtime and Structured Questions

Implements `prd.md > Autonomous Agent Activity Feed`, `Dynamic TODOs`, `Structured Clarifications Through ask_user`, and `Autonomous Execution and Internal Cancellation`.

`packages/agent-core` owns ToolLoopAgent planning/orchestration, audit execution lifecycle/budgets, TODOs, questions, verification and classification. `apps/desktop/src/utility` is the composition entry: inject Browser Runtime, AI Providers and validated Main service adapters into Agent Core. Stream actual progress/tool/result events, not hidden reasoning. Main supervises the process and remains the native/security/persistence authority, without duplicating Agent Core's business loop. A UI view switch never owns execution. Agent Core and Browser Runtime serialize tool execution even when a model proposes parallel calls.

Tools: `inspect_page`, `navigate`, `click`, `fill`, `select`, `press`, `scroll`, `wait_for`, `capture_evidence`, `update_todos`, `ask_user`, `propose_finding`, and optional `list_webmcp_tools` / `call_webmcp_tool`. Locator arguments are typed role/label/test-id/selector descriptions; do not expose arbitrary JavaScript, shell, filesystem or unrestricted HTTP tools to the model. Trusted helpers may evaluate fixed inspection code internally.

`ask_user` carries `{id, kind, prompt, options?, required, min?, max?, format?, inputType, allowSkip}` through Contracts. Agent Core owns question lifecycle/answer acceptance; UI and Main validate response schemas and privileged authorization before forwarding. Dismissal leaves the question pending; supported Skip is a distinct outcome with safe-alternative/Blocked handling. Approve/Deny bind to an exact eligible operation. Main's secret broker returns an ephemeral opaque reference to authorized execution, never a raw model-visible value; consume/discard it and persist safe metadata only. Keep the established five TODO states and separate audit/ownership/action-outcome states.

### Shared Authorization and Action Policy

Implements `prd.md > Target Authorization and Browser Boundaries`, `Risk-based Action Permissions`, and `Sensitive Input Lifecycle`.

Agent Core applies business-level risk decisions; Browser Runtime sends every Playwright/WebMCP action through the same validated Main authorization/lease path before execution in Utility. Main enforces hard security rules, ownership/generation, exact privileged approval and native browser boundaries; it does not run the business planner or Playwright. Bind the audit to parsed `http://localhost:<port>` and authorized scope; path entry cannot replace the origin. Native navigation/session request guards and popup denial apply during both owners' control. Provider HTTPS traffic originates in AI Providers in Utility, not Renderer or guest browsing permissions.

Understood goal-scoped low-risk actions can run; eligible meaningful/uncertain effects require structured approval; real financial transactions, irreversible destruction and other hard restrictions stay blocked. A pending grant includes audit ID, browser/document generation, action/tool identity, exact arguments and affected resources; consume once and invalidate on change/navigation/recovery. Page text, WebMCP annotations and a GET method are not proof of safety. If effects cannot be bounded sufficiently, skip the action rather than treat approval as a universal override.

Use conservative tool checks plus the guest's native request gate for recognized risky/uncertain requests, including during User control. Do not invent a universal classifier for arbitrary backend effects; disclose what cannot be established. Unknown requests/actions must not silently execute as low risk. Preserve low-risk forms when their effects are understood, rather than requiring approval for every form. Test these essential paths on the actual app during development; unsupported safety-critical behavior is a real blocker to that action, not a reason for an open-ended research program.

### Optional Experimental WebMCP Adapter

Implements the learner's 2026-10-24 additive tool-strategy decision alongside `prd.md > Evidence-Backed Findings` and `Risk-based Action Permissions`.

**Measured: works in the existing packaged embedded session.** With `--enable-features=WebMCP`, Playwright 1.64.1 discovered and called an owned tool; an independent native read observed marker `42`. A normal Playwright action and a page with no tools both worked afterward. No bridge/embedding change was needed. [Bounded report](feasibility/runs/2026-10-24T15-35-34-179Z-webmcp.json); [reproduction tool](feasibility/browser-lab/tools/webmcp-probe.cjs). This Chromium exposes `document.modelContext`, while `navigator.modelContext` is absent: do not use the latter alone as the capability test.

- Enable the experimental browser feature. On each main-frame document, call public `page.webmcp.tools({timeout: 1500})`; refresh once before a proposed invocation. States are Available / No tools / Unavailable. Catch absence/errors and continue with Playwright without requiring website changes or repeated retries.
- Browser Runtime in Utility uses public `page.webmcp.callTool(name, validatedInput, {timeout: 15000})` only after the shared business policy and Main authorization/ownership gates. Keep main-frame scope for the POC. Bound discovery to 20 tools, descriptions to 2,000 characters and total metadata to 64KiB; reject malformed/oversized schemas or unknown names.
- Treat names, descriptions, schemas, hints and outputs as untrusted data, never system instructions or safety grants. Validate JSON inputs, cap/sanitize results, record tool identity/source and independently inspect actual effects. Clear stale discovery on navigation/recovery.
- Use tools for appropriate structured auxiliary actions, not to skip UI interactions the goal is testing. Sign-in feedback, navigation usability, labels, validation and similar UX checks use actual Playwright interaction. Tool output alone cannot verify a UI defect.
- A timeout/throw after invocation may have side effects: record Unknown and inspect/reconcile before any alternative. Do not automatically retry or redo the same action through Playwright. Discovery failure before invocation is safe ordinary fallback.
- If a later runtime update breaks this optional adapter, mark it Unavailable and defer it; keep the core browser workflow working.

### Evidence, Findings and Local Reports

Implements `prd.md > Evidence-Backed Findings`, `Contextual Findings and Dedicated Findings View`, `Read-only Audit Overview`, and `Local Projects, Sessions, and Reports`.

Agent Core records action start through Main before dispatch and the independently observed result afterward. Browser Runtime captures/sanitizes safe screenshot/DOM observations and relevant console/network summaries linked to actual tool-event IDs; Main writes them through Persistence. Mask known sensitive elements; omit artifacts that cannot be safely retained. Do not persist raw credentials, cookies, request bodies or unsanitized tool/provider errors. Pino logs IDs/status/error codes with redaction, not full prompts/arguments.

The model proposes findings; trusted verification code in Agent Core assigns Verified only with a traceable expectation source, observed mismatch, sufficient linked evidence, safe independent Playwright reproduction through Browser Runtime and timing/input/environment checks. Main validates the persistence request and stores the classification; it does not become the business verifier. Manual participation and WebMCP results stay attributed and cannot replace that gate. Otherwise retain Suspected Finding or UX Observation with uncertainty. Store title, description, class, severity, confidence, expected/actual, steps, evidence references, suggested fix and limitations. Persistence supplies local report read models under Main ownership, with separate classification counts, actual progress and coverage limits; never fabricate summaries/metrics.

### Providers and Credentials

Implements `prd.md > New Audit Setup and Preflight`, `Provider Connectivity and Automatic Recovery`, and `Sensitive Input Lifecycle`.

`packages/ai-providers` runs the direct BYOK integrations, model selection and request handling in Utility using the approved AI SDK. Main owns encrypted credentials and supplies per-run/preflight capabilities privately; Renderer has no provider client or credential-store access. Use an editable model ID and tool-capability preflight; unsupported models fail setup with an actionable message. Keep all four provider integrations, but record live validation only for providers whose user-supplied keys are available. No automatic provider/model switching.

| Provider / adapter | HTTPS request and credentials | Response consumed |
| --- | --- | --- |
| [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai), `createOpenAI(...).chat(modelId)` | `POST https://api.openai.com/v1/chat/completions`, Bearer key; model, messages, tool schemas, bounded output, streaming | choices/delta text and tool_calls; finish_reason; usage when supplied |
| [Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), `createAnthropic` | `POST https://api.anthropic.com/v1/messages`, x-api-key/version headers through SDK; model, system/messages, tools, max_tokens, streaming | content-block text/tool_use and input JSON deltas; stop reason; usage |
| [Gemini](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai), `createGoogleGenerativeAI` | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`, SDK key auth; contents, systemInstruction, tools, generationConfig | candidates/content parts/text/functionCall; finishReason; usageMetadata |
| [OpenRouter](https://openrouter.ai/docs/api-reference/overview), `createOpenAICompatible` | `POST https://openrouter.ai/api/v1/chat/completions`, Bearer key; model, messages, tools, streaming; include usage when supported | OpenAI-compatible choices/delta/tool_calls; available usage/cost metadata |

All adapters normalize streamed text/tool calls, finish reason and available token usage; validate tool inputs locally. SDKs encode provider wire formats. Pricing, rate limits and availability vary by selected model/account; show unavailable cost/usage explicitly, respect Retry-After and configured budgets. Small preflight requests may incur the provider's ordinary charges. No hosted FlowProof service or gateway account is required.

After Electron is ready, check `safeStorage.isAsyncEncryptionAvailable()`; use `encryptStringAsync` / `decryptStringAsync` and its `result` field. Store only ciphertext in a main-owned file under userData; the renderer gets configured/not-configured status, never saved keys. If OS encryption fails, explain and leave connection setup uncompleted; do not save plaintext. See [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

## Data Model and Communication Contracts

`packages/persistence` contains SQLite/Drizzle implementations, repositories, migrations and local report/evidence storage; these execute only under Electron Main ownership. It is not a separate process and is not imported into Utility, Preload or Renderer. Agent Core requests storage through validated Main IPC ports. Keep one SQLite file with foreign keys and five small tables; typed JSON payloads hold evolving progress instead of creating a subsystem/table per feature.

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
- Utility ↔ Main: start/cancel/question-resolution, authorized-session descriptors, privileged action/ownership grants, persistence/evidence requests and safe outcomes/events. Browser Runtime executes browser tools in Utility after Main authorization; it does not ask Main to run Playwright. No arbitrary method names or raw CDP from model output. Match audit/generation/request IDs and reject stale work.
- UI events: `{auditId, seq, at, type, safePayload}` defined by Contracts. Agent Core business events and Main native events pass through Main validation/persistence before publication. Subscribe once through Preload, deduplicate by seq and fetch missed events/snapshot on return. UI layout state never becomes audit authority.

## Execution Limits and Important Failure Modes

Implements `prd.md > Audit Outcomes and Coverage Limits`, `Autonomous Execution and Internal Cancellation`, and the provider/browser recovery behaviors.

Approved POC defaults: **40 model steps, 10-minute wall-clock audit budget, 15-second browser/WebMCP action timeout, 45-second model request timeout, 5-second shutdown/cleanup deadline**. Budget time includes questions/User control; expose elapsed/remaining time. Optional token/cost caps apply when measurable, with no invented prices. Check limits before model requests, tools and recovery; unknown-cost models still have step/time limits.

- **Provider interruption:** Preserve state, show Reconnecting, retry only the failed model request up to three times with bounded 1/2/4-second backoff plus jitter/Retry-After within budget. One retry owner prevents SDK retries multiplying this limit. Invalid keys/quota/model errors do not retry. Never replay completed tools or switch providers. Exhaustion ends Interrupted.
- **Browser failure / uncertain action:** Exclude further browser work; mark unavailable/Unknown accurately. Attempt at most two target recreations, invalidate old handles/grants, inspect actual state and rebind the same displayed session. Restore User ownership after a User crash, or Awaiting Control Decision after pending-handoff crash; require explicit Return and checks before Agent continuation. If safety cannot be re-established, end Interrupted with partial results.
- **Questions / permissions:** Await valid answers; approval is exact and one-use, Skip is distinct, denial/hard restriction seeks a safe alternative. No safe continuation means Blocked with its actual reason. Never call an unsafe operation to finish a demo.
- **Shutdown / worker / storage failure / budget exhaustion:** Enter Terminating when possible, prohibit new work, cancel supported requests, allow only bounded in-flight completion and record Unknown if unestablished. Save Interrupted, close guest/worker, discard temporary secrets. On next launch finalize incomplete records for inspection without execution or claims that forced cleanup succeeded.

## Planned File Structure

```text
flowproof-ai/
  package.json                     # root npm Workspaces and command aliases; create later
  package-lock.json                # single root dependency lockfile; create later
  tsconfig.base.json / vitest.config.ts # shared compiler/test configuration when built
  apps/
    desktop/
      package.json                 # desktop workspace manifest when built; no local lockfile
      electron.vite.config.ts       # main/preload/renderer and explicit Utility build entry
      electron-builder.yml         # package desktop + workspace code + rebuilt native SQLite
      src/
        main/
          index.ts / ipc.ts        # native startup/lifecycle and privileged validated IPC
          agent-supervisor.ts      # supervise packaged Utility entry, not business orchestration
          credentials.ts           # Main-only OS-backed secure storage
          browser/{host,cdp-bridge,session,ownership}.ts # native guest/transport/security ownership
        preload/index.ts           # minimal typed Renderer ↔ Main bridge
        renderer/
          index.html / main.tsx / App.tsx / styles.css
          components/              # workspace, setup, feed, TODOs, questions, findings/reports
          components/ui/           # needed shadcn primitives only
          api.ts / store.ts        # preload query hooks and UI layout/navigation state
        utility/index.ts           # compose Agent Core, Browser Runtime and AI Providers
      test/                        # desktop/IPC/credentials, actual-host smoke/acceptance tests
        fixtures/sign-in/          # later acceptance fixture, not another app workspace
  packages/
    contracts/
      package.json                 # each listed workspace gets a manifest only when built
      src/{index,types,schemas,ipc,events,ports}.ts # platform-neutral shared contracts
      test/                        # runtime contract validation tests
    agent-core/
      package.json
      src/{index,audit,planner,lifecycle,budgets,todos,questions,verifier}.ts
      test/                        # orchestration, questions, budgets, verification/classification
    browser-runtime/
      package.json
      src/{index,connection,tools,evidence,webmcp}.ts # Utility-only Playwright/CDP/capture
      test/                        # browser tools, sanitization, optional adapter behavior
    ai-providers/
      package.json
      src/{index,openai,anthropic,google,openrouter,retry}.ts # Utility-only SDK adapters
      test/                        # request handling and provider normalization
    persistence/
      package.json
      src/{index,schema,repositories,evidence-store,reports}.ts # Main-owned storage
      migrations/ / test/          # SQLite migrations and storage/report tests
  devpost/                         # existing plans, evidence and official build checklist
```

This is the approved target organization, not existing application code. One root npm lockfile covers all workspaces; do not create package-local lockfiles or extra app/package workspaces. The existing diagnostic lab/evidence stays in place as historical support and is not an additional product workspace.

## Where It Runs and How Someone Tries It

Windows 11 x64, Node 24-compatible development tooling and a BYOK account. These are **commands the first build slice must supply**, not a claim the app already exists:

```powershell
npm ci
npm run dev          # root alias to @flowproof/desktop; build/watch desktop and Utility
npm run typecheck    # root script checks desktop and shared workspace boundaries
npm test             # focused Vitest tests in apps/desktop/test and packages/*/test
npm run build
npm run package:win  # root alias packages desktop, Utility/workspace code and native SQLite
```

Run `apps/desktop/dist/win-unpacked/FlowProof AI.exe` with sibling files for the smoke test; produce an unsigned Windows installer for sharing when the core works. Root scripts delegate through npm Workspaces (for example `npm run dev --workspace @flowproof/desktop`), not a separate orchestration service. Build/package shared workspace code with the desktop, include its Utility entry and rebuild native SQLite for Main's Electron runtime; do not rely on developer source paths or a separately installed Node. Native-module packaging is ordinary build work, fixed if it blocks launch. Retain established fuse settings; signing/updater/integrity-enforcement work is deferred.

After the app works, add the small React sign-in fixture under `apps/desktop/test/fixtures/sign-in` and the root `npm run fixture` test command serving `http://localhost:3000`; it is not another app workspace. Demonstrate real BYOK → goal → autonomous UI actions/TODOs → question if needed → seeded defect with explicit expected feedback → safe independent reproduction → truthful report → restart/reopen. Include a no-WebMCP target; an optional benign WebMCP demonstration must not replace the UI audit. Deliver a short demo video and public GitHub repository; hosting is optional.

## Focused Build Order and Done Criteria

1. **Launchable shell:** npm Workspaces desktop/Main/Preload/Renderer/Utility entry, Contracts, Main-owned guest and Utility-hosted Browser Runtime with visible real Playwright interaction; package these early to catch distribution blockers.
2. **Local setup:** Persistence under Main, Main secure credentials, AI Providers preflight in Utility, setup/draft/single-audit guard; a real configured provider completes tool-capability preflight.
3. **Autonomous run:** Agent Core in Utility supplies the bounded SDK loop, TODOs/questions and business lifecycle; Browser Runtime executes serialized tools after Main native/security authorization. Preserve real events, Take/Return and origin/policy enforcement.
4. **Evidence and report:** Browser Runtime captures safe real artifacts, Agent Core verifies/classifies, Main persists through Persistence and Renderer presents read-only local history after restart.
5. **Optional WebMCP:** Browser Runtime's thin adapter uses the same Agent Core/Main gates; no-tools/unsupported fallback, visible-UX preservation and honest attribution. Defer any adapter blocker without blocking Playwright.
6. **Acceptance/demo:** add the sign-in fixture later; run the end-to-end workflow, a denied/out-of-scope action, secret-output check and bounded failure/Interrupted smoke. Package, record the demo and prepare repository/submission in `6-ship`.

Use small Vitest tests for policy, ownership, questions, budgets and verification; use a few actual Electron/Playwright smoke paths for the kernel and packaged launch. No new exhaustive input/worker/CDP/security matrices or prerequisite broad feasibility sign-off. Report missing live-provider/hardware coverage honestly; fix actual core/security blockers as encountered.

## What Was Simplified and Why

- Adopt the demonstrated browser mechanism provisionally; keep [checkpoint 2](spec-checkpoint-2.md) and [raw evidence](browser-feasibility-results.json) as historical support rather than the active work queue. Historical INCONCLUSIVE results remain inconclusive.
- One supervised Utility process, five shared code packages, one typed event stream, five local tables and direct BYOK calls. npm Workspaces supplies organization, not extra processes. No event bus service, plugin system, hosted backend, multi-agent orchestration or production policy-contract framework.
- Basic approved recovery/budget/secret rules remain; defer exhaustive races, broad OOPIF/worker compatibility, hardware/IME/DPI campaigns, long-duration performance, signed release/updater and advanced ASAR hardening.
- Keep four provider integrations and the complete essential user journey. Implement each minimally before visual edge-case polish. The actual browser, autonomous execution and evidence-based verification are real, never simulated.

## Decisions and Open Issues

- **Learner direction:** Small impressive working POC, fixed product/stack, provisional WebContentsView + CDP + Playwright, optional untrusted WebMCP with normal fallback, no further broad pre-build campaigns.
- **Uncertainty resolved:** Same displayed target and optional WebMCP discovery/invocation worked in the actual packaged host. This build exposes document.modelContext; version labels or navigator checks alone would have been misleading.
- **Approved implementation blueprint:** The learner approved the process/file/data contracts, build tooling, initial SDK pins and numeric defaults in this simplified specification. No provider credentials were requested/used during planning; live provider results belong to development.
- **Approved organization amendment:** npm Workspaces, `apps/desktop` with Main/Preload/Renderer/Utility, and exactly the five shared packages above. Agent Core owns business orchestration; Browser Runtime and AI Providers execute in Utility; Main owns the native browser, security, process supervision, secure credentials and Persistence execution. The approved six-slice order is unchanged.
- **Known limitations:** Arbitrary backend effects cannot be universally inferred from page labels, methods or tool hints; prevent unbounded unsafe actions and disclose coverage. Full CDP/hardware/release-hardening coverage is deferred, not reported as passed. Tool/protocol problems get focused fixes only when they block the chosen core path.
- **Approval and handoff:** The learner explicitly approved this specification and requested official `5-build`; `4-spec` is complete. Follow the approved implementation sequence with verified working slices. Begin `6-ship` only after the core application passes a real end-to-end acceptance test and the build's final hands-on review/wrap-up are complete. No product implementation is claimed by this approval record.
- **Current authorization:** Architecture recording and a local documentation checkpoint only. Wait for explicit authorization before Slice 1, dependency installation, manifests, source directories or implementation; this documentation commit does not begin `5-build` execution or `6-ship`.
