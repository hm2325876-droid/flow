---
doc: spec
status: approved
---

# FlowProof AI — Hackathon Technical Spec

**Approved technical specification · 2026-10-24.** The learner explicitly approved this simplified specification and authorized official `5-build`. `4-spec` is complete. Preserve the approved product and stack; implement a small complete workflow using the demonstrated WebContentsView + CDP + Playwright integration provisionally. Broad pre-build feasibility campaigns are replaced by focused development checks. Build progress is recorded in [checklist.md](checklist.md).

**Approved architecture amendment:** Keep the npm Workspaces monorepo and process/package ownership below. Slice 1 is mechanically verified at `78e3d09`. The provider amendment was recorded in `c7b0b42`; the learner subsequently authorized implementation of **Slice 2 only**, including its required dependencies, verification and local checkpoint. Slice 3, Slice 4, product WebMCP and `6-ship` remain unstarted and unauthorized.

**Approved provider amendment · 2026-10-25 · after Slice 1 (`78e3d09`):** Models.dev supplies model discovery and capability metadata; Vercel AI SDK supplies provider integration and model execution through installed, registered adapters. This replaces the restriction to four hardcoded providers with broad provider/model compatibility through SDK integrations, without promising universal support or implementing each provider protocol from scratch. The original amendment was documentation-only. The subsequent Slice 2 implementation authorization now applies; preserve completed Slice 1 evidence and stop before Slice 3.

## How This Works, In Plain Language

FlowProof is one Windows desktop app. You connect your AI provider, enter an authorized localhost URL and goal, and watch an agent test the real page displayed inside the workspace. The agent updates TODOs, asks structured questions when necessary, captures real evidence, and saves findings locally. Playwright does the browser/UX testing; optional WebMCP tools help only when they suit the task and pass the same permission checks.

Use the working native browser integration as the starting point. Build one useful slice at a time, fix actual blockers, and disclose unsupported behavior. No cloud backend, extra agent platform, generic chat interface, or additional browser architecture is needed.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`, `New Audit Setup and Preflight`, and `Local Projects, Sessions, and Reports`.

1. **Launch:** Electron opens the premium off-white workspace and reads local projects/settings. Incomplete prior audits become read-only Interrupted records; they never restart.
2. **Connect AI:** The user searches the Models.dev-backed catalog, filters advisory capabilities and selects an adapter-supported provider/model. Main stores required keys securely and supplies them privately to AI Providers in Utility for a small real connectivity/tool-round-trip preflight; only a fresh validated configuration becomes Ready.
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
| Model discovery | [Models.dev public JSON catalog](https://github.com/anomalyco/models.dev#api) for advisory provider/model metadata; discovery/cache/compatibility interfaces stay in existing AI Providers |
| Agent | Agent Core, Browser Runtime and AI Providers execute in one [Electron Utility Process](https://www.electronjs.org/docs/latest/api/utility-process); [AI SDK ToolLoopAgent](https://ai-sdk.dev/docs/agents/building-agents) supplies the bounded model/tool loop |
| Local records | [SQLite](https://www.sqlite.org/docs.html), [Drizzle 0.45.4 proxy driver](https://orm.drizzle.team/docs/connect-drizzle-proxy) over the runtime’s bundled [`node:sqlite` `DatabaseSync`](https://nodejs.org/download/release/v24.13.0/docs/api/sqlite.html#class-databasesync) in `packages/persistence`; storage executes only under Main ownership |
| Diagnostics/release | [Pino](https://getpino.io/) safe structured logs, [Vitest](https://vitest.dev/guide/) targeted tests, [electron-builder](https://www.electron.build/) Windows x64 folder/installer |

Start from the tested browser pair. Historical planning pins were examples, never a provider cap. Slice 2 now installs `ai@7.0.153` and registers `@ai-sdk/openai@4.0.102`, `@ai-sdk/anthropic@4.0.88`, `@ai-sdk/google@4.0.105`, `@ai-sdk/openai-compatible@3.0.78` (fixed trusted OpenRouter endpoint), `@ai-sdk/deepseek@3.0.73` and `@ai-sdk/groq@4.0.70`. Additional reviewed, installed adapters can extend this initial coverage without rewriting provider protocols. Models.dev metadata never triggers installation. APIs are checked against installed types/documentation.

**Slice 2 internal implementation corrections:** Compatible dependency/security patch pins are now Zod `4.6.7`, Vitest `4.1.12` and Vite `7.3.7`; these updates preserve the approved stack. Persistence uses `drizzle-orm@0.45.4` with the documented proxy callback interface (`drizzle-orm/sqlite-proxy`) and Node’s bundled `DatabaseSync` for a single settings table. The callback executes parameterized local SQLite statements under Main, with no HTTP proxy/server. This replaces the planned better-sqlite3/native-rebuild detail for this slice while retaining SQLite/Drizzle and Main-only storage ownership. Full audit history remains Slice 4. [Ajv](https://ajv.js.org/) remains a later WebMCP input-validation choice, with no remote schema loading.

Slice 2 produces a validated, memory-only audit-start configuration. Its UI explicitly states that autonomous execution becomes available in Slice 3; it creates no audit session, synthetic activity or finding. Final desktop/package and live-provider verification outcomes must be recorded from actual checks; this implementation note does not assert their completion.

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

Use one root install and lockfile. Each implemented npm workspace has a small `package.json` declaring its name/exports/dependencies; these are workspace manifests, not additional root manifests or independent lockfiles. Slice 2 populates AI Providers and Persistence within the approved five-package layout; Agent Core remains planned for Slice 3.

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
| `@flowproof/ai-providers` | Models.dev discovery/metadata/cache policy, selection, adapter registry, compatibility/preflight and normalized AI SDK execution; runs in Utility | Contracts; Main IPC ports for credential/cache persistence |
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

All catalog discovery, capability normalization, selection, installed-adapter registration, compatibility checks and execution interfaces belong to **the approved `packages/ai-providers` boundary**, now implemented in Utility for Slice 2. This package was absent from Slice 1; Agent Core remains planned for Slice 3. Add only necessary serializable DTO/runtime schemas to existing `packages/contracts`; do not introduce an additional catalog package, new process or provider marketplace. Agent Core consumes the same normalized model/execution port. Main retains credential/cache persistence ownership; Renderer never owns SDK clients or stored keys. Autonomous audit orchestration remains Slice 3.

#### Models.dev Catalog and Advisory Metadata

Use documented **`GET https://models.dev/api.json`** (public, no provider key), which returns provider-scoped model data. The [official API reference](https://github.com/anomalyco/models.dev#api-reference) describes the published v1 JSON projection, distinct from its v2 contributor TOML schema. Keep provider/model lookup identifiers as stable opaque IDs, preserve their case, and never substitute display names. Retain a selected supported ID even when absent from a later catalog; allow explicit model-ID entry for a registered adapter when discovery is incomplete, still subject to strict validation/preflight.

| Published catalog fields, where present | Application use; all advisory |
| --- | --- |
| Provider/model lookup IDs and `name` | Search/display and stable provider/model reference, not SDK factory names |
| Provider `npm`, `env`, `api`, `doc` | SDK/auth/documentation hints only; never dynamic imports/installs, environment reads or endpoint authority |
| Model `tool_call` | Advertised tool-calling support; Agent readiness still requires a real tool round trip |
| Optional `structured_output` | Advertised native structured-output support; require it only for features that use it |
| `reasoning` | Advertised reasoning capability; does not authorize exposing hidden reasoning in the activity feed |
| `modalities.input`, `modalities.output` | Separate input/output capability hints; discovery does not add new multimodal product features |
| `limit.context`, `limit.input`, `limit.output` | Informational token limits used conservatively; actual provider/runtime limits may differ |
| `cost.input`, `cost.output`, optional cache/reasoning cost fields | Informational USD-per-million-token estimates, with unknown values explicit; no guaranteed real-time billing |
| `last_updated`, `status` where supplied | Catalog facts such as alpha/beta/deprecated, not authenticated service-health observations |

Preserve advertised true, false and Unknown as distinct capability states; absent metadata is neither unsupported nor validated support. Models.dev discovers/describes models; it never receives provider keys or runs inference. Vercel AI SDK and the selected adapter handle model requests and provider protocols, subject to local validation and the existing Agent policies.

Fetch the fixed official HTTPS JSON endpoint from AI Providers in Utility, with a short bounded timeout/size/schema check. Display sanitized metadata as text; no remote scripts or catalog-defined permissions. Do not confuse `tool_call` from the published API with v2 source-file `capabilities.tools.supported`. No Models.dev package/distribution name is assumed; a bundled last-known-good JSON snapshot from the documented endpoint is sufficient offline fallback.

#### Installed Adapters and Selection States

The UI searches providers/models, filters relevant capabilities and displays useful limits/modalities/pricing with age/Unknown labels. Browsing is broad; execution is not. Intersect a selection with a **trusted application registry** of installed, registered official AI SDK adapters and supported authentication/model APIs. Catalog-listed providers with no available adapter/auth path remain visible as Unsupported with a reason and execution disabled. Adapter-supported but unchecked models are Unverified and may be configured/tested, not launched autonomously. A working registered path is the POC priority; do not install every adapter or promise every catalog entry.

The registry maps provider IDs to code-imported SDK factories, allowed model-ID mapping/options, credential requirements and trusted endpoint configuration. Prefer official adapters and a reviewed OpenAI-compatible configuration where applicable; this is configuration around SDK adapters, not bespoke wire integrations per provider/model. **Never** import/install the catalog's `npm` value, read arbitrary local variables named by `env`, or use an arbitrary catalog `api` URL. New adapters are added only through normal reviewed application dependencies/registration during authorized implementation, never by metadata refresh.

Validate provider ID against the trusted registry and model ID as a bounded non-blank opaque string without control characters or URL/module/path interpretation; apply adapter-specific restrictions/mapping where required. Keep `(providerId, modelId, adapterId)` separate from display labels and SDK lookup serialization. The [documented `createProviderRegistry` / `registry.languageModel`](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) can compose installed providers; resolve an explicitly configured provider model instance rather than passing a bare catalog string to the SDK's default global provider/Gateway. No FlowProof/Gateway account or silent provider/model fallback is introduced.

| Compatibility layer | Evidence / UI meaning |
| --- | --- |
| Catalog metadata | Advertised / Unknown; helpful discovery, never proof |
| Installed/registered adapter | Locally available execution/auth path; absent means Unsupported |
| Authenticated or registry-defined keyless connectivity | Actual bounded request accepted for the selected model/account |
| Agent-required tool protocol | Actual schema-valid tool invocation, local result and successful follow-up consumption |
| Runtime reliability | Only observed behavior for the tested configuration; never guaranteed by catalog flags or one probe |

#### Focused Runtime Preflight

Use one bounded SDK operation with **at most two small model requests** jointly checking connectivity and the minimum Agent tool protocol—no extra paid ping. Through [documented `generateText`, `tool({inputSchema, execute})` and bounded multi-step `stopWhen: isStepCount(2)`](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), offer one harmless in-memory `capability_probe`. Put an unpredictable challenge in the prompt and require it in locally validated tool arguments; the local tool returns a new receipt not present in the initial prompt. The second request must consume that tool result and acknowledge the receipt. Use adapter-supported tool choice for the first request, then allow a final text acknowledgement without forcing another tool call. Apply suitable small output/reasoning limits, not unsupported forcing/strict-output options as universal requirements. [Set `maxRetries: 0` and use a bounded `abortSignal`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) for preflight; no outer automatic retries or extra diagnostic requests may exceed the two-request limit. No browser, filesystem, permissions, user-content or audit actions occur.

Inspect normalized SDK tool calls/results and completion rather than text-generation success alone. Missing/invalid calls, unsupported tool schemas/protocol, failed receipt consumption, rejected model/auth/quota or network failure leave Ready false with actionable safe status and Retry Checks. Metadata `tool_call: true` alone never passes. Native structured output is validated only if a selected Agent feature requires it; otherwise label it advisory/unverified without extra probing. Do not create an expensive compatibility matrix, auto-repair loop, hidden model switching or nested retries. Live authenticated verification must be recorded separately from isolated request-path tests; never infer success without a valid authorized test key.

Cache readiness for a short **five-minute** window keyed by provider/model, adapter/version/registry revision, credential revision (opaque version issued by Main, never the secret/hash) and probe-schema revision. Changing any key invalidates it. Dismissing setup invalidates its preflight authority even within that window; reopening requires fresh checks and consent as defined in the PRD. Retain non-sensitive previous-validation history across launches, but run a fresh check after restart/expiry when needed. Search/filter/catalog refresh makes no model request. Within one uninterrupted setup, Connect AI / Review & Start / immediate pre-start verification reuse a just-completed, fresh matching result instead of duplicate calls; Main always revalidates current consent, target, budgets and one-active-audit conditions. An actual later provider failure still follows approved request-level recovery and never replays browser actions.

#### Catalog Cache, Offline Fallback and Credential Boundary

Keep a last-known-good normalized JSON catalog with source/fetchedAt/schema revision; AI Providers owns refresh/cache policy and requests Main-owned persistence through its existing port. Refresh at most about once per day in the background or on an explicit retry, not per keystroke/audit step. Refresh failure uses cached data or an optional bundled JSON snapshot, marks age/staleness and preserves configured stable IDs. With no catalog at all, a saved supported selection or explicit registered-adapter/model-ID path may still be checked. Metadata fetch failure alone does not invalidate adapter availability or a still-fresh validated configuration; historical validation never proves present connectivity after expiry or outage. Catalog loss is not an application defect or provider/model failover trigger.

Pricing is informational and may be stale, tier/account-specific or incomplete. Show its timestamp/Unknown; never treat it as a guaranteed invoice or hard real-time spend measurement. Continue step/time and available actual usage guards, and disclose uncertainty in cost estimates. Store no provider key in catalog/cache/selection/validation history. Main owns OS-backed key storage and releases keys only to the selected trusted Utility adapter path, bound to provider/adapter/credential revision; Renderer receives sanitized metadata/status, never saved key values. Never place credentials in prompts, logs, activity events, telemetry or plaintext persistence; sanitize SDK diagnostics/errors before publication. No catalog-defined permissions, remote dependency installation or arbitrary code/endpoints are allowed.

#### Provider Request Examples, Not an Exhaustive Provider List

The following are existing SDK adapter examples, not a product allowlist or a requirement to hand-build these wire protocols. Additional installed/registered official adapters can use the same normalized interface without adding per-model integrations.

| Provider / adapter | HTTPS request and credentials | Response consumed |
| --- | --- | --- |
| [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai), `createOpenAI(...).chat(modelId)` | `POST https://api.openai.com/v1/chat/completions`, Bearer key; model, messages, tool schemas, bounded output, streaming | choices/delta text and tool_calls; finish_reason; usage when supplied |
| [Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), `createAnthropic` | `POST https://api.anthropic.com/v1/messages`, x-api-key/version headers through SDK; model, system/messages, tools, max_tokens, streaming | content-block text/tool_use and input JSON deltas; stop reason; usage |
| [Gemini](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai), `createGoogleGenerativeAI` | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`, SDK key auth; contents, systemInstruction, tools, generationConfig | candidates/content parts/text/functionCall; finishReason; usageMetadata |
| [OpenRouter](https://openrouter.ai/docs/api-reference/overview), `createOpenAICompatible` | `POST https://openrouter.ai/api/v1/chat/completions`, Bearer key; model, messages, tools, streaming; include usage when supported | OpenAI-compatible choices/delta/tool_calls; available usage/cost metadata |

All adapters normalize streamed text/tool calls, finish reason and available token usage; validate tool inputs locally. SDKs encode provider wire formats. Pricing, rate limits and availability vary by selected model/account; show unavailable cost/usage explicitly, respect Retry-After and configured budgets. Small preflight requests may incur the provider's ordinary charges. No hosted FlowProof service or gateway account is required.

After Electron is ready, check `safeStorage.isAsyncEncryptionAvailable()`; use `encryptStringAsync` / `decryptStringAsync` and its `result` field. Store only ciphertext in a main-owned file under userData; the renderer gets configured/not-configured status, never saved keys. If OS encryption fails, explain and leave connection setup uncompleted; do not save plaintext. See [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

## Data Model and Communication Contracts

`packages/persistence` contains SQLite/Drizzle implementations, repositories, migrations and local report/evidence storage; these execute only under Electron Main ownership. It is not a separate process and is not imported into Utility, Preload or Renderer. Agent Core requests storage through validated Main IPC ports. The complete product targets one SQLite file with foreign keys and the five small tables below; typed JSON payloads hold evolving progress instead of creating a subsystem/table per feature. Slice 2 creates only `settings` for non-sensitive selection, drafts and validated catalog snapshots. Projects/audits/events/findings history remains later work; setup creates no fake session or activity record.

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
- Slice 2 provider DTOs in Contracts: provider/model reference, sanitized catalog metadata + freshness, installed-adapter availability, selection, credential revision/status and layered connectivity/tool-readiness result with checkedAt/expiry/safe reason. AI Providers exposes discovery/filter/resolve/preflight/execution interfaces; Renderer queries them only through Preload/Main/Utility. These setup contracts are implemented in Slice 2, not retroactively claimed as Slice 1 APIs. Generic Main persistence stores non-sensitive cache/settings; no sixth table, package or catalog-admin subsystem is required.

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
      electron-builder.yml         # package desktop/workspaces; use runtime-bundled SQLite
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
      src/{index,catalog,registry,selection,preflight,requests}.ts # Utility discovery + registered SDK execution
      test/                        # cache/fallback, registry safety, readiness and normalized requests
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
npm run package:win  # packages desktop, Utility/workspace code; SQLite is runtime-bundled
```

Run `apps/desktop/dist/win-unpacked/FlowProof AI.exe` with sibling files for the smoke test; produce an unsigned Windows installer for sharing when the core works. Root scripts delegate through npm Workspaces (for example `npm run dev --workspace @flowproof/desktop`), not a separate orchestration service. Build/package shared workspace code with the desktop, include its Utility entry and use Main’s runtime-bundled SQLite without a separate native rebuild; do not rely on developer source paths or a separately installed Node. The Slice 2 settings driver correction avoids adding an Electron/native-addon ABI packaging dependency. Retain established fuse settings; signing/updater/integrity-enforcement work is deferred.

After the app works, add the small React sign-in fixture under `apps/desktop/test/fixtures/sign-in` and the root `npm run fixture` test command serving `http://localhost:3000`; it is not another app workspace. Demonstrate real BYOK → goal → autonomous UI actions/TODOs → question if needed → seeded defect with explicit expected feedback → safe independent reproduction → truthful report → restart/reopen. Include a no-WebMCP target; an optional benign WebMCP demonstration must not replace the UI audit. Deliver a short demo video and public GitHub repository; hosting is optional.

## Focused Build Order and Done Criteria

1. **Launchable shell:** npm Workspaces desktop/Main/Preload/Renderer/Utility entry, Contracts, Main-owned guest and Utility-hosted Browser Runtime with visible real Playwright interaction; package these early to catch distribution blockers.
2. **Local setup:** Models.dev catalog/cache/search/capability filters and installed AI SDK adapter/model selection in AI Providers/Utility; Main OS-backed BYOK/Persistence; lightweight real connectivity/tool-round-trip readiness, New Audit/draft/consent, localhost validation, budgets and one-audit checks. Full autonomous execution remains Slice 3.
3. **Autonomous run:** Agent Core in Utility supplies the bounded SDK loop, TODOs/questions and business lifecycle; Browser Runtime executes serialized tools after Main native/security authorization. Preserve real events, Take/Return and origin/policy enforcement.
4. **Evidence and report:** Browser Runtime captures safe real artifacts, Agent Core verifies/classifies, Main persists through Persistence and Renderer presents read-only local history after restart.
5. **Optional WebMCP:** Browser Runtime's thin adapter uses the same Agent Core/Main gates; no-tools/unsupported fallback, visible-UX preservation and honest attribution. Defer any adapter blocker without blocking Playwright.
6. **Acceptance/demo:** add the sign-in fixture later; run the end-to-end workflow, a denied/out-of-scope action, secret-output check and bounded failure/Interrupted smoke. Package, record the demo and prepare repository/submission in `6-ship`.

Use small Vitest tests for policy, ownership, questions, budgets and verification; use a few actual Electron/Playwright smoke paths for the kernel and packaged launch. No new exhaustive input/worker/CDP/security matrices or prerequisite broad feasibility sign-off. Report missing live-provider/hardware coverage honestly; fix actual core/security blockers as encountered.

## What Was Simplified and Why

- Adopt the demonstrated browser mechanism provisionally; keep [checkpoint 2](spec-checkpoint-2.md) and [raw evidence](browser-feasibility-results.json) as historical support rather than the active work queue. Historical INCONCLUSIVE results remain inconclusive.
- One supervised Utility process, five shared code packages, one typed event stream, five local tables and direct BYOK calls. npm Workspaces supplies organization, not extra processes. No event bus service, plugin system, hosted backend, multi-agent orchestration or production policy-contract framework.
- Basic approved recovery/budget/secret rules remain; defer exhaustive races, broad OOPIF/worker compatibility, hardware/IME/DPI campaigns, long-duration performance, signed release/updater and advanced ASAR hardening.
- Keep catalog-driven discovery, a registered working SDK provider/model path and the complete essential journey. No arbitrary provider-count cap, universal-compatibility claim, automatic adapter installer or provider marketplace. The browser, execution and evidence-based verification are real, never simulated.

## Decisions and Open Issues

- **Learner direction:** Small impressive working POC, fixed product/stack, provisional WebContentsView + CDP + Playwright, optional untrusted WebMCP with normal fallback, no further broad pre-build campaigns.
- **Uncertainty resolved:** Same displayed target and optional WebMCP discovery/invocation worked in the actual packaged host. This build exposes document.modelContext; version labels or navigator checks alone would have been misleading.
- **Approved implementation blueprint:** The learner approved the process/file/data contracts, build tooling, initial SDK pins and numeric defaults in this simplified specification. No provider credentials were requested/used during planning; live provider results belong to development.
- **Approved organization amendment:** npm Workspaces, `apps/desktop` with Main/Preload/Renderer/Utility, and exactly the five shared packages above. Agent Core owns business orchestration; Browser Runtime and AI Providers execute in Utility; Main owns the native browser, security, process supervision, secure credentials and Persistence execution. The approved six-slice order is unchanged.
- **Known limitations:** Arbitrary backend effects cannot be universally inferred from page labels, methods or tool hints; prevent unbounded unsafe actions and disclose coverage. Full CDP/hardware/release-hardening coverage is deferred, not reported as passed. Tool/protocol problems get focused fixes only when they block the chosen core path.
- **Approval and handoff:** The learner explicitly approved this specification and requested official `5-build`; `4-spec` is complete. Follow the approved implementation sequence with verified working slices. Begin `6-ship` only after the core application passes a real end-to-end acceptance test and the build's final hands-on review/wrap-up are complete. No product implementation is claimed by this approval record.
- **Approved provider amendment:** Models.dev discovery/advisory metadata plus registered AI SDK execution replaces the former fixed provider list. Model readiness requires available trusted adapter, current credentials/connectivity and real Agent tool round trip. Existing npm workspaces/processes/security boundaries remain unchanged; no new package.
- **Current authorization:** Slice 2 implementation, focused verification and one local checkpoint are explicitly authorized after `c7b0b42`. Preserve Slice 1 evidence at `78e3d09`. Stop after model discovery, secure configuration and truthful ready-to-run audit setup; Slice 3, Slice 4, product WebMCP and `6-ship` remain unstarted. Smoke/package outcomes and live-provider status belong in the actual verification evidence, not an inferred completion claim.
