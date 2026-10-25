---
doc: spec-archive
status: archived
---

# FlowProof AI — Archived Feasibility Checkpoint 2

**Historical snapshot, superseded by [the POC technical spec](spec.md).** On 2026-10-24 the learner explicitly chose a small working hackathon application, provisional adoption of the demonstrated browser integration, optional WebMCP, and focused validation during implementation. The broader pre-build gates below are historical research requirements, not the current implementation workflow. Observations remain unchanged.

**Feasibility checkpoint 2, not a final build blueprint.** The scope and PRD are approved; `3-prd` is complete and `4-spec` is in progress. The learner approved continuing WebContentsView + CDP validation, not final architectural selection. This draft now includes a reproducible native/session-control lab and actual packaged Windows-host results. Full implementation remains gated on a completed and explicitly approved technical specification.

## How This Works, In Plain Language

The desktop workspace and the audited application have different trust levels. Electron owns the trusted workspace and a native view containing one isolated audit page. Playwright must operate that exact displayed page, not another browser with copied state. A trusted coordinator must serialize Agent and User control, apply boundaries, and preserve evidence and history; the model must never receive unrestricted desktop, Electron, or browser-debugging access.

The first browser-wide CDP probe exposed partition-cookie and blanket input-veto failures. The second checkpoint addresses those cases with a native partition-bound session adapter, an authenticated guest-scoped CDP bridge backed by the displayed WebContents' Electron debugger, and a separate trusted native input shield. Controlled authentication, observable Playwright input, Win32 input routing, bounded handoff/recovery, scoped-access checks, and an actual packaged Windows host were exercised successfully. This is not the complete production security/compatibility proof: human/IME/accessibility coverage, arbitrary business-effect policy, broader protocol coverage, and full product lifecycle remain open. No final embedding/transport mechanism is selected.

Implements `prd.md > Real Live Browser Preview`, `Browser Control Ownership and Handoff`, and `Mandatory 4-spec Validation`.

## Evidence and Approval State

| Level | Current evidence | What it does not establish |
| --- | --- | --- |
| Approved product constraints | `scope.md` and `prd.md`, both approved | A particular implementation's feasibility |
| Official documentation/source | Native embedding, CDP attachment, debugger APIs, security hooks, deprecated alternatives | Complete interoperability in FlowProof |
| Checkpoint 1 baseline | Browser-wide CDP proved same target but exposed cookie/input failures | A production-safe transport or complete lifecycle |
| Executed checkpoint 2 lab | Nine ownership contracts; 32 cases in development and in a packaged Windows host, including independently observed effects | Human input matrix, arbitrary business semantics, full CDP/worker compatibility, shipping a packaged Agent, or complete product security |
| Learner-approved validation direction | Continue WebContentsView + CDP, including session/input/handoff/security/packaged testing | Final architecture or specification approval |

**Overall browser gate: OPEN.** Do not convert a successful individual probe into a blanket compatibility claim. No screenshot-streaming or separate hidden-browser substitute has been introduced or approved.

## Approved Stack and Operating Envelope

Carry forward `scope.md > Preserved Architecture and Stack` unchanged. These are learner-approved choices, not new selections made by this draft.

- Desktop/runtime: [Electron](https://www.electronjs.org/docs/latest/), [Node.js](https://nodejs.org/api/), Windows 11 x64; local-first, account-free, no hosted backend or cloud database.
- Workspace: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), [Vite](https://vite.dev/guide/), [Tailwind CSS 4](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs), [Zustand](https://zustand.docs.pmnd.rs/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview).
- Agent: [Playwright](https://playwright.dev/docs/library), [Vercel AI SDK](https://ai-sdk.dev/docs/introduction); OpenAI, Anthropic, Google Gemini, and OpenRouter BYOK remain required.
- Persistence/diagnostics/distribution: [SQLite](https://www.sqlite.org/docs.html), [Drizzle ORM](https://orm.drizzle.team/docs/overview), [Pino](https://getpino.io/), [electron-builder](https://www.electron.build/), [Vitest](https://vitest.dev/guide/).
- One active audit, one isolated audit browser session/context and shared tab. The trusted workspace renderer is not a second audit browser. Preserve native rendering, exclusive ownership, recovery limits, action permissions, secret lifecycle, local history, and all approved UI decisions.

The browser pair remains Electron 45.0.0 / Playwright Core 1.64.1. The lab additionally pins ws 8.22.0, electron-builder 26.15.3, and @electron/fuses 2.1.3. These are diagnostic toolchain pins, not a final application dependency selection. Other dependency versions and external-provider contracts remain complete-spec work; documentation links do not imply those integrations were tested.

## Browser Options and Tradeoffs

Implements `prd.md > Mandatory 4-spec Validation`. Embedding and automation attachment are separate decisions; an embedding API alone does not establish Playwright compatibility.

| Candidate | Benefits and evidence | Security/compatibility risks | Current position |
| --- | --- | --- | --- |
| WebContentsView + unrestricted browser-level CDP | Native embedding and same-target control demonstrated in checkpoint 1 | Observed cookie-context mismatch and input-veto failure; browser-wide unauthenticated debugging exposure | Historical baseline, not recommended as a production transport |
| WebContentsView + experimental Playwright Electron launcher | Official experimental automation path; can launch/control an Electron host | Requires launch/supervision design; main-process inspection and nodeCliInspect fuse implications; packaged startup and guest/partition behavior need testing | Documented comparator; not executed in this checkpoint |
| WebContentsView + native-debugger-backed scoped CDP bridge | Checkpoint 2 implements a guest-only authenticated protocol subset, partition-bound cookie adapter, and native shield; bounded development and packaged-host tests passed | Custom protocol maintenance; OOPIF/worker/full-context coverage incomplete; DevTools detachment, real hardware and production effect-policy/lifecycle still need proof | Recommended provisional continuation, not final architecture |
| Legacy BrowserView | Older native embedding model | Deprecated since Electron 29; replaced by WebContentsView; does not solve attachment or ownership risks | Avoid as the default for new work |
| Ordinary standalone Chromium or screenshot transport | Familiar automation or rendering capture | Does not meet the approved native exact-session embedded UX as ordinarily configured | Not an authorized fallback; any proposed product change requires discussion and approval |

The experimental Electron launcher is not inherently a higher-fidelity Playwright-protocol replacement: its implementation connects to Chromium and Node debugging endpoints. Do not confuse `browserType.connect()` to a Playwright launchServer endpoint with CDP attachment to Electron.

## Validation Checkpoint 2 — Development and Packaged Windows Host

### Reproducible Setup and Evidence Contract

Durable lab: [feasibility/browser-lab/README.md](feasibility/browser-lab/README.md). Evidence index: [browser-feasibility-results.json](browser-feasibility-results.json). The lab is a bounded diagnostic integration under `devpost/feasibility`, not the FlowProof application or `5-build`.

- Runtime: Windows 11 x64 family, kernel 10.0.22631; Node 24.13.0 controller; Electron 45.0.0 with Chromium 156.0.8078.48 and embedded Node 24.22.0; Playwright Core 1.64.1.
- One actual audit guest uses a unique in-memory Electron partition. The trusted shell and transparent native shield are UI surfaces, not second audit browsers. Sandbox/context isolation/webSecurity remain enabled; the guest has no Node or privileged preload bridge.
- Playwright's public connectOverCDP connects to an authenticated loopback WebSocket endpoint that forwards a constrained protocol subset to that guest's native debugger. The unrestricted Chromium remote-debugging switch is removed and its requested port is tested closed. This is a scoped CDP attachment variant, not merely a proxy hiding an open browser-wide listener.
- The native session adapter binds cookie get/set/clear to the current guest's Electron Session. The bridge does not treat Playwright's synthetic/default BrowserContext identity as an authoritative partition binding.
- Native shield attachment and focus ownership separate Win32 input routing from targeted CDP input; the shield is detached on User control. OS-input checks run at observed 144 DPI with PER_MONITOR_AWARE_V2 coordinates and positive User-control checks. SendInput is an OS-path test, not actual human hardware or IME validation.
- Background guest throttling is disabled. Three scheduling switches from the pinned Playwright launcher are recorded: disable-background-timer-throttling, disable-backgrounding-occluded-windows, and disable-renderer-backgrounding. No security-disabling launch switches or credential-store overrides were copied. A hidden-window normal-click case verifies effects independently; energy and long-duration behavior are not characterized.

From `devpost/feasibility/browser-lab`: run `npm ci --no-audit --no-fund`, `node tools/contracts-report.cjs`, `npm run test:dev`, `npm run build:win`, and `npm run test:packaged`. The builder creates an unsigned `out/win-unpacked/FlowProof Feasibility Lab.exe` with app.asar. A trusted external Node controller launches that packaged host and supplies the local test server; shipping/bootstrapping a packaged Agent worker is not proven by this host test.

Each timestamped run records configuration/runtime/source hashes and per-case setup, expected result, observed result, event evidence, limitations, and PASS/FAIL/INCONCLUSIVE. Global limitations also apply to each case. Packaged evidence records actual executable and ASAR hashes, verifies archived host/bridge/coordinator source parity and runtime manifest identity, and checks fuse states. Builder removes development-only manifest fields, so those are not claimed byte-identical. Known synthetic broker/bootstrap/auth-cookie values are checked and excluded/redacted. A successful suite exit does not turn INCONCLUSIVE into PASS.

### Latest Authoritative Runs

| Stage | Evidence | PASS | FAIL | INCONCLUSIVE |
| --- | --- | --- | --- | --- |
| Ownership contracts | [2026-10-24T14-32-13-810Z](feasibility/runs/2026-10-24T14-32-13-810Z-contracts.json) | 9 | 0 | 0 |
| Development | [2026-10-24T14-35-35-223Z](feasibility/runs/2026-10-24T14-35-35-223Z-development.json) | 24 | 0 | 8 |
| Packaged Windows host | [2026-10-24T14-33-24-489Z](feasibility/runs/2026-10-24T14-33-24-489Z-packaged.json) | 28 | 0 | 4 |

The current packaged run reports app.isPackaged=true and app.asar=true. Its four INCONCLUSIVE cases are Agent native mouse, Agent native wheel, User mouse/key positive control, and the unperformed human/IME/assistive matrix. The first three were safely aborted because desktop ownership/position conditions were not established; they are not passes. Development additionally has inconclusive native keyboard/pending-input cases and packaged-only source/fuse cases. The complete records retain these conditions and all prior failures.

The [earlier packaged native-controls run](feasibility/runs/2026-10-24T13-54-08-317Z-packaged.json) recorded 31 PASS/0 FAIL/1 INCONCLUSIVE under valid desktop conditions. Its native host/coordinator/helper source hashes match the corresponding current files, but its bridge/artifact predates the multibyte-auth hardening below. It is supporting capability evidence, not a substitute for repeating the current binary's inconclusive input cases on a quiet, unobscured desktop. The latest matrix is authoritative for the latest artifact and is not rewritten for a cleaner count.

### Results by Requested Priority

| Priority | Expected and independently observed result | Evidence cases | Remaining limit |
| --- | --- | --- | --- |
| Session fidelity | HttpOnly SameSite=Strict authentication agrees between server, native partition, page, and context adapter across reload; get/add/clear/logout affect the audit partition while UI cookies remain separate; sessionStorage/localStorage match native reads | session-authentication-reload; session-adapter-cookie-mutation; session-storage-native-consistency; session-logout-consistency | Controlled host/path contract, not CHIPS/OAuth/WebAuthn or every context API |
| Exclusive input | CDP mouse/sequential-key effects pass on the current artifact. Supporting controlled runs show shield receipt and unchanged guest fields/scroll, plus User positive controls. Several current OS-path cases safely aborted and remain inconclusive | input-agent-cdp-with-shield; input-agent-cdp-keyboard; input-native-mouse-agent; input-native-keyboard-agent; input-native-wheel-agent; input-user-native-path; input-native-wheel-user | Rerun current artifact's aborted cases; one-DPI Win32 route is not human/IME/assistive coverage |
| Handoff and failure | Pending transfer refuses new leases and keeps manual input excluded until observed one-time completion; Return checks actual boundary/identity and fixture/server state; invalid return stays excluded; crashes invalidate old leases/transport/tokens; two injected recreation failures end Interrupted; unknown completion never grants competing control or causes replay | handoff-inflight-serialization; handoff-return-inspection; handoff-return-invalid-state; recovery-user-control; recovery-pending-handoff; recovery-exhaustion-two-failed-attempts; handoff-unknown-outcome-remains-excluded | Known fixture reconciliation and explicit fault injection, not complete Agent/TODO/database or automatic uncertainty-resolution liveness |
| Security | Missing auth, browser-Origin and malformed multibyte-token handshakes return 401 with host responsive; a second authorized client is refused with 409; invalid bootstrap, workspace attach and Browser.close denied; raw debug port closed; origin escapes cancelled; guest lacks privileged APIs; known effect policy enforced in both modes | security-cdp-unauthorized; security-bootstrap-controller; security-cdp-workspace-confinement; security-raw-debug-port; security-navigation-and-isolation; security-operation-policy-user; security-operation-policy-agent | Scoped protocol/threat subset and fixed trusted effect catalog, not universal business semantics or compromised trusted-process protection |
| Packaged behavior | The real unpacked Windows executable runs from ASAR; archived native-host sources match; RunAsNode/NodeOptions/NodeCliInspect/file extra-privilege fuses are disabled and ASAR-only loading enabled | packaging-runtime; packaging-source-parity; packaging-fuses | Unsigned unpacked host, not installer/signing/integrity-fuse enforcement/upgrade or a shipped Agent worker |

### Root Causes, Corrections, and Review

1. The baseline cookie mismatch is a partition/API binding issue, not evidence that the displayed page and Playwright page differ. For this scoped attachment variant, a secure partition-bound adapter is necessary; the tested cookie surface now uses the actual native audit Session.
2. The blanket native veto blocked CDP too. A separate trusted native shield intercepts OS input while CDP still targets the actual guest. Initial native-input failures were traced with DOM event coordinates to DPI double-scaling in the PowerShell helper; PMv2 fixed the harness geometry. Invalid foreground/owned hit-test/pointer/modifier conditions remain INCONCLUSIVE and never trigger input into another app.
3. A later desktop run exposed actionability stalls despite per-guest backgroundThrottling=false. The pinned upstream scheduling subset and an explicit hidden-window effect test were added; the final development and packaged runs passed the controlled case. Earlier failures remain visible and no broad scheduling guarantee is claimed.
4. Direct self-review found that an unknown pending-handoff result could release User control. The [captured RED contract run](feasibility/runs/2026-10-24T13-48-55-150Z-contracts.json) reproduced it. The coordinator now retains recovery exclusion, and the final contract/native tests check unknown-history preservation, no competing control, safe controlled recovery, and no replay. The uncertainty is deliberately injected, not misreported as a naturally occurring provider failure.
5. A malformed authorization-negative test exposed a string-character-length versus UTF-8-buffer-length mismatch before timingSafeEqual. The [RED selected-case run](feasibility/runs/2026-10-24T14-26-37-613Z-development.json) recorded a rejection timeout. Comparing byte lengths before the constant-time check corrected it: the [GREEN regression](feasibility/runs/2026-10-24T14-29-23-994Z-development.json) and both current full runs observe 401 and a responsive host. This test targets the owned lab only; it is not a claim about external applications.

The independent review tool was unavailable due to its usage limit; direct self-review and executable checks were completed instead. The [dependency audit](feasibility/dependency-audit.json) recorded zero known advisories for this lab on 2026-10-24, while transitive deprecation warnings and normal point-in-time audit limitations remain documented.

### Architectural Recommendation and Open Mandatory Gates

**Recommend provisional continuation of the native WebContentsView + guest-scoped CDP variant**, with its partition-bound session adapter, native input shield/focus coordinator, per-generation transport revocation, and inspected operation leases. Do not adopt the original unrestricted browser-wide listener as the production transport. This recommendation is supported by bounded packaged-host results, not approval of a complete implementation.

Keep the overall gate OPEN until these are resolved:

- Human hardware, IME composition, accessibility/UI Automation, touch, drag/drop, shortcuts/modals, multiple monitors, and broader DPI/focus coverage. A native shield is not proven to block every possible OS/assistive input route.
- Repeat the current artifact's safety-aborted OS-input cases under established foreground, unobscured-window and stable-pointer conditions; earlier positive observations are supporting evidence only.
- Complete scoped CDP compatibility: OOPIF/worker/service-worker routing, all required storage/permission/download/cleanup APIs, DevTools-detachment behavior, and a supported version matrix. The lab implements a protocol subset; unsupported child-session events are not a production solution.
- Production permission design for arbitrary targets. The diagnostic approval is a one-request permit for a fixed method/path/generation and no-variable-body effect catalog. Trusted contract provenance, exact payload/resource/recipient binding, background-request race consumption, and unknown application effects remain unvalidated. Do not treat the fixture grant map as the full PRD permission implementation or weaken enforcement to Agent-only checks.
- Full automatic uncertainty-recovery liveness, Agent/TODO/history reconciliation, old-partition/auth-cache cleanup, durable Interrupted reporting, and whole-host/OS termination handling. The lab deliberately exercises controlled recreation, not the full application runtime.
- Signed installer, ASAR integrity-enforcement fuse, upgrade behavior, packaged Agent/Playwright worker startup, and long-duration background/performance/energy behavior. The lab's temporary always-on-top/activation setup is not selected product UX.

## Historical Checkpoint 1 — Browser-wide CDP Baseline

### Runtime and Method

Executed on 2026-10-23 in a disposable directory outside the app workspace. Host: Windows x64, kernel release `10.0.22631`, host Node `24.13.0`. Candidate: Electron `45.0.0`, its Chromium `156.0.8078.48` and embedded Node `24.22.0`, Playwright Core `1.64.1`. Playwright's reference Chromium for that release is `156.0.8078.4`: matching major versions are useful context, not a compatibility guarantee or a final version pin.

The harness created a BrowserWindow with a native WebContentsView and a unique non-persistent audit partition. The guest used sandbox/context isolation, no Node integration, and no privileged preload bridge. Playwright attached using connectOverCDP with noDefaults enabled. A local counter/input page supplied controlled, non-sensitive diagnostic state; no AI keys, existing projects, or sign-in acceptance fixture were used.

Target identity was established with public CDP Target.getTargetInfo and Electron webContents.fromDevToolsTargetId, comparing the result to the WebContents actually assigned to the native view. URL equality or copied cookies alone would not establish this.

Historical machine-readable evidence: [feasibility/checkpoint-1-results.json](feasibility/checkpoint-1-results.json). The current evidence index is [browser-feasibility-results.json](browser-feasibility-results.json). Checkpoint 1's temporary debugging listener was diagnostic exposure, not an approved production transport; its failed observations are retained as baseline evidence.

### Observed Results

| Check | Observation | Interpretation |
| --- | --- | --- |
| Exact displayed target | CDP target mapped to native guest ID 2 | Same target demonstrated; no duplicate automation page |
| Native frame progression | Baseline runs stalled, including a latest run with document state visible; disabling guest background throttling produced 10 animation frames in 1.5 seconds and visible document state | Explicit background-rendering policy is needed; full visual/performance matrix remains open |
| Normal Playwright interaction | fill and normal click worked after that adjustment; native read saw the input nonce, counter 1, and matching sessionStorage | Basic same-page control demonstrated without force-click or fabricated success |
| Guest isolation | Guest process/require were undefined; sandbox and context isolation enabled; test cookie present only in audit partition | Limited isolation checks passed, not a complete security assessment |
| Context-cookie fidelity | Native audit partition contained one test cookie; Playwright's returned BrowserContext.cookies reported zero | Concrete adapter/API-fidelity blocker; do not use a default context as the authority for the audit partition |
| Native input veto | Blanket before-input/before-mouse cancellation also vetoed the CDP click; click resolved while counter stayed 1 | Concrete ownership-mechanism blocker; tool completion alone is not evidence of effect |
| Routing and URL guards | A diagnostic page-route request was aborted. Different-origin destination reachability was established; native navigation returned ERR_BLOCKED_BY_CLIENT with a webRequest cancellation event, and the reached redirect source produced a will-redirect cancellation. Neither escaped request reached that destination | Limited enforcement evidence; not universal navigation or business-effect coverage |
| Popup | Denied window.open; one audit page remained | Limited single-tab evidence |
| Renderer crash | Native guest replacement and CDP rebinding succeeded with IDs 3 and 4; prototype owner markers remained User and Awaiting Control Decision | Rebinding mechanism demonstrated; full Agent scheduling, in-flight races, and history reconciliation not implemented |

The probe completed cleanup, and the immediate post-run process inspection found no Electron process. Earlier cold-download timeout and GUI-stdin EOF were harness/environment issues, not browser compatibility findings. Diagnostic failures are retained in the evidence rather than reported as passing.

An independent read-only review found that the initial boundary assertions did not establish cancellation causality sufficiently. The final probe added a reachable loopback destination, a reached redirect source, explicit native cancellation events, and no-escaped-request assertions; the stronger checks passed. This does not expand their limited coverage into a universal security proof.

### Reproduction at This Checkpoint

Historical local harness directory: `C:\Users\Hala\AppData\Local\Temp\opencode\flowproof-browser-probe`. Its original reproduction command is `npm --prefix "C:\Users\Hala\AppData\Local\Temp\opencode\flowproof-browser-probe" run probe`; this does not exercise checkpoint 2. The durable current lab, lockfile, native host, controller, and instructions now live under `devpost/feasibility/browser-lab`.

The command's successful completion means observations were collected, not that all checks passed. Inspect per-check outcomes and the explicitly untested cases in the JSON evidence.

## Proposed Components and Trust Boundaries

These component responsibilities follow approved behavior; process/file/transport choices are still provisional. Every final component contract must be completed before 5-build.

### Trusted Desktop Host and Native Surface Manager

Own the workspace and audit WebContents, native bounds, view visibility/layering, partition creation, popups, and explicit destruction. A BrowserWindow-plus-guest arrangement was probed; BaseWindow-plus-separate-views is a documented composition alternative. Native views require real layout/focus coordination, not assumed React DOM z-index behavior.

Implements `prd.md > Workspace Layout and Observation UI`, `Real Live Browser Preview`, and `Autonomous Execution and Internal Cancellation`.

### Session Identity and Automation Adapter

Bind an audit ID and browser generation to the displayed WebContents and CDP target. Expose only approved, target-scoped tools to the Agent; never choose pages[0] or identify a target solely by URL. The checkpoint 2 partition-bound cookie adapter is validated for the controlled get/set/clear/authentication cases; other context-wide storage/permission/cleanup APIs still need proof. Rebinding invalidates stale leases, connections and tokens. This is a recommended prototype boundary, not final architecture approval.

Implements `prd.md > Real Live Browser Preview`, `Browser Failure Detection and Automatic Recovery`, and `Evidence-Backed Findings`.

### Exclusive Ownership Coordinator

Serialize scheduling and ownership transitions; block new work during pending transfer, User control, recovery, or termination as required. Check ownership/generation before dispatch and state/evidence commitment. Controlled supporting runs demonstrate Win32 routing and positive controls; current CDP input and several current native/handoff cases pass, with the current artifact's safety-aborted OS cases explicitly inconclusive. Unknown completion retains recovery exclusion. Human/IME/assistive input and the full concurrency matrix remain open; this is not the complete Agent runtime.

Implements `prd.md > Browser Control Ownership and Handoff`, `Structured Clarifications Through ask_user`, and `Dynamic TODOs`.

### Boundary and Permission Enforcer

Enforce the authorized target using parsed URLs and explicit native/session guards, alongside trusted tool checks. will-navigate alone is insufficient: Electron documents that programmatic loadURL/back and same-document navigation do not emit that guard event. Centralize session webRequest ownership because only the last registered listener is used; logging must not replace enforcement.

Origin restrictions and OS/browser permission handlers do not identify arbitrary business effects. GET can have side effects, and a localhost application can trigger external backend activity. The approved risk-based policy, especially direct User-control enforcement, needs an explicit effect-classification/authorization design and proof. Do not silently weaken the policy to Agent-only checks, a model instruction, or blanket POST blocking.

Implements `prd.md > Target Authorization and Browser Boundaries`, `Risk-based Action Permissions`, and `Audit Outcomes and Coverage Limits`.

### Agent Runtime, Questions, and Evidence Verification

Use the approved Node/AI SDK stack for planning, bounded requests, structured tools/questions, TODO reconciliation, and conservative verification. Actual events and observations establish outcomes; the input-veto probe demonstrated why a resolved tool promise is insufficient. Full provider/model contracts, token/cost behavior, cancellation deadlines, schemas, and verifier implementation are not yet specified at this checkpoint.

Implements `prd.md > Autonomous Agent Activity Feed`, `Structured Clarifications Through ask_user`, `Provider Connectivity and Automatic Recovery`, `Autonomous Execution and Internal Cancellation`, and `Evidence-Backed Findings`.

### Local Storage, Secrets, and Read-only Reports

Retain SQLite/Drizzle for approved non-sensitive project/session/event/TODO/finding/report metadata and local evidence references. Keep sensitive question values ephemeral, provider keys OS-backed, and audit browsing state separate from execution. Electron 45 deprecates synchronous safeStorage methods; evaluate its asynchronous APIs when specifying the credential adapter. No database schema or credential implementation has been selected by this checkpoint.

Implements `prd.md > Sensitive Input Lifecycle`, `New Audit Setup and Preflight`, `Local Projects, Sessions, and Reports`, `Read-only Audit Overview`, and `Contextual Findings and Dedicated Findings View`.

### Trusted Workspace Renderer

Carry forward React 19/TypeScript/Vite and the approved off-white three-zone UI. Expose a narrow validated bridge only to the trusted workspace; the audited page gets no privileged Electron/IPC bridge. UI view changes, resizes, and history inspection must not own the Agent lifecycle. Native-view bounds/visibility requests need sender and payload validation.

Implements `prd.md > Screens and Layout`, `Look and Feel`, `Project Navigation During an Active Audit`, and `Workspace Layout and Observation UI`.

## Security and Compatibility Gates

- **Guest isolation:** Preserve sandbox, context isolation, no Node integration, webSecurity, separate audit partition, constrained permissions, and absence of privileged guest bridges. Localhost page content remains untrusted.
- **Debug transport:** Checkpoint 2 removes the unrestricted Chromium debug listener and uses authenticated guest-scoped WebSocket-to-native-debugger CDP with nonce-authenticated controller bootstrap. Missing/browser-Origin/stale credentials, second clients and workspace targets are rejected in tested cases. Complete protocol coverage and production threat-model review remain open; the named pipe is control/bootstrap, not CDP transport itself.
- **Ownership:** Current CDP/handoff/unknown-result checks and supporting controlled Win32-route observations are bounded evidence. Safety-aborted current-artifact input cases remain inconclusive; repeat them before input sign-off. Physical human/assistive/IME routes and comprehensive race/liveness behavior remain mandatory gates.
- **Session fidelity:** Controlled cookie get/set/clear/authentication and DOM storage checks pass against the actual Electron partition. Broader storage/permission/route/teardown APIs and old-partition cleanup still require proof; a correct Page is not blanket context fidelity.
- **Native lifecycle:** BaseWindow does not automatically destroy child WebContents on close. Prove explicit cleanup, background execution, DPI/layout/modals, and renderer replacement. Distinguish renderer failure from whole Electron/browser-host failure and preserve the approved next-launch Interrupted recovery.
- **Business effects:** Define enforceable permission boundaries for both owners and document any platform limitation before proposing a product change. Native URL guards alone do not prove the entire action policy.
- **Distribution:** The pinned native host was executed as an actual Windows ASAR package with source parity and fuse checks. This is not signed installer, integrity-enforcement, upgrade or packaged Agent-worker validation. The experimental launcher still has inspection/fuse risks and has not been adopted.

Implements `prd.md > Mandatory 4-spec Validation`; none of these gates is waived by PRD approval.

## The Core Journey Through the Proposed System

1. The trusted setup surface sends validated non-sensitive configuration to preflight; keys remain in the credential boundary. Current authorization/budgets/single-audit checks gate activation.
2. The host creates one isolated native audit guest and establishes identity; the Agent receives only the scoped automation facade after ownership and boundary checks succeed.
3. Normal actions produce actual observed events and artifacts. Ownership handoff serializes input; returning requires fresh inspected state and plan/TODO/history reconciliation.
4. Structured question responses are validated in UI and trusted runtime. Required answers/explicit Skip and single-operation approvals follow the approved distinct outcomes.
5. Provider retries do not replay browser operations. Renderer recovery replaces the native target and invalidates old handles; ownership restoration follows the approved User/Handoff-Pending rules.
6. Verification uses traceable expectations, actual Agent execution, independent reproduction, and false-positive checks. Trustworthy events are persisted incrementally; termination preserves partial Interrupted results without unsafe replay.
7. Completed/Blocked/Interrupted sessions open compact chronologically ordered read-only history and overviews, without restarting execution or disturbing another active audit.

Implements `prd.md > The Core Journey`. The unresolved gates above prevent treating this narrative as an approved implementation mechanism.

## Where It Runs and How Someone Tries It

The product remains a Windows 11 x64 local desktop application with BYOK. The required hackathon deliverables are a short demo recording and a public GitHub repository; deployment is optional. Build FlowProof first and introduce the sign-in acceptance fixture later, as approved in the scope.

There is no runnable FlowProof application or root package manifest yet. The durable lab commands above start a diagnostic controller and native host, not FlowProof. The complete spec must define the actual application install/start/package/demo commands, packaged Agent worker, and remaining versioned runtime contracts after the gates and consequential choices are resolved.

## Planning Artifacts and Blueprint Completion

```text
devpost/
  learner-profile.md                 # Progress, constraints, and learner decisions
  scope.md / scope.html              # Approved scope and visual companion
  prd.md / prd.html                  # Approved product contract
  spec.md / spec.html                # This provisional technical checkpoint
  browser-feasibility-results.json   # Measured diagnostic observations and limits
  feasibility/browser-lab/          # Reproducible bounded diagnostic sources/lockfile
  feasibility/runs/                 # Per-case development/packaged/contract observations
  feasibility/checkpoint-1-results.json # Preserved original baseline
  feasibility/dependency-audit.json  # Point-in-time lab dependency audit
```

This is the actual planning-artifact tree, not the final application file structure. Before technical approval, finish the annotated application tree, full component/IPC/tool contracts, concrete data model and event ordering, provider API/usage/error contracts, credential handling, UI/native-view integration, numeric budgets/deadlines, version pins, packaging/startup, and verification slices. Do not start 5-build from an incomplete checkpoint.

## What Was Simplified and Why

Use a controlled diagnostic counter/authentication page and fixed effect catalog to isolate browser mechanics before committing to host/transport design. This is not application-specific audit logic or the later sign-in acceptance fixture. It does not implement an AI runtime, product database or report pipeline. The approved product, stack, native browser, permissions and evidence contract are not substituted; the narrower diagnostic limits remain explicit.

## Decisions and Open Issues

- **Learner-approved:** Product requirements, fixed stack, platform, local-first/BYOK model, and priority to evaluate exact-session native Chromium before choosing the final implementation.
- **Observed:** Checkpoint 1 failures remain historical. Checkpoint 2's session adapter, native shield, bounded handoff/recovery, scoped-access cases and packaged Windows host have bounded passing evidence. The full gate remains open for the limitations above.
- **Genuine uncertainty addressed:** Whether Electron's displayed native page can be the exact Playwright-controlled target. The target-ID/WebContents identity check and independent native DOM reads demonstrated this narrow capability, while exposing why that is not yet the complete compatibility/security proof.
- **Learner agreement:** Continue the WebContentsView + CDP candidate and prioritize session fidelity, native input, handoff, security and packaged validation. This is validation authorization only, not final architectural approval.
- **Recommendation for review:** Continue the native-debugger-backed guest-scoped CDP variant with the tested adapter and native shielding, conditionally. Do not ship the unrestricted listener or treat the fixed policy catalog/partial protocol as production-complete. The experimental launcher remains an unadopted comparator.
- **Blocking technical work:** Complete the explicitly open mandatory gates and the final component/IPC/tool/provider/data/file-tree/worker contracts. A limitation needs a technical solution or learner discussion, never a hidden browser, screenshot fallback or silent security-policy relaxation.
- **Approval state:** `spec.md` remains draft and is not ready for final specification approval or full implementation. Results and remaining blockers are ready for learner review; `5-build` has not started.

## Research Sources

Official sources checked on 2026-10-23; live/latest docs can evolve, so recheck against chosen versions before implementation.

- [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view), [deprecated BrowserView](https://www.electronjs.org/docs/latest/api/browser-view), [BaseWindow resource management](https://www.electronjs.org/docs/latest/api/base-window#resource-management), [native View layout](https://www.electronjs.org/docs/latest/api/view).
- [Playwright connectOverCDP](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp), [experimental Electron automation](https://playwright.dev/docs/api/class-electron), [Electron launcher source](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/electron/electron.ts).
- [Playwright 1.64.1 Chromium target/context handling](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/chromium/crBrowser.ts), [1.64.1 reference browser versions](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/browsers.json).
- [Electron debugger transport](https://www.electronjs.org/docs/latest/api/debugger), [WebContents target identity/input/navigation/crash APIs](https://www.electronjs.org/docs/latest/api/web-contents), [session webRequest](https://www.electronjs.org/docs/latest/api/web-request), [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
- [Electron 45.0.0 release and runtime versions](https://releases.electronjs.org/release/v45.0.0), [Electron npm metadata](https://registry.npmjs.org/electron/latest), [Playwright Core npm metadata](https://registry.npmjs.org/playwright-core/latest).
- Checkpoint 2 sources checked on 2026-10-24: [pinned Playwright 1.64.1 scheduling switches](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/src/server/chromium/chromiumSwitches.ts), [Electron cookie API](https://www.electronjs.org/docs/latest/api/cookies), [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses). Lab pins also record ws/electron-builder/@electron/fuses registry metadata; the lockfile is canonical for this diagnostic bundle.
