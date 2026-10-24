---
doc: checklist
status: draft
---

# FlowProof AI — Build Checklist

The simplified technical specification is approved and official `4-spec` is complete. This checklist translates its unchanged six-slice implementation sequence into verifiable working increments for official `5-build`.

The approved architecture discussion is now recorded: npm Workspaces, one desktop application and five shared code packages. The sequence is unchanged; no slice is implemented or completed. This is a documentation-only update; wait for explicit authorization before creating application directories/manifests, installing dependencies or starting Slice 1.

Build mode: Not yet selected. No build-mode choice or implementation authorization is inferred from this architecture record; official hands-on checkpoints and final review remain required.

Git: Local repository initialized at `D:\FlowProof-AI`; initial planning/configuration commit `96273ac`. Current permission covers architecture documentation and one local documentation-only commit. Application implementation remains paused. Preserve unrelated local files and exclude learner-profile/credentials; do not push to a remote.

The commands below are implementation targets supplied by their slices, not commands claimed to exist already. Smoke checks exercise the actual FlowProof application and record real observations; deterministic test pages and unit doubles must never be presented as autonomous Agent execution or acceptance results. Real provider configuration is entered in the application, not pasted into chat or committed.

## Approved Workspace and Ownership Map

- One root npm Workspaces manifest/lockfile will coordinate `apps/desktop` and `packages/{contracts,agent-core,browser-runtime,ai-providers,persistence}`; workspace manifests are created only during authorized implementation, with no workspace-local lockfiles or extra orchestration platform.
- `apps/desktop/src/main` owns windows/lifecycle, native WebContentsView/session, security/privileged IPC, Utility supervision, secure credentials and Persistence access. `preload` is the minimal typed bridge; `renderer` is UI only, without direct SQLite/key/Node/CDP access.
- `apps/desktop/src/utility` hosts Agent Core business orchestration, Browser Runtime Playwright/CDP/evidence/WebMCP and AI Provider integrations. Utility requests storage/credentials/native authorization through validated Main IPC; Persistence executes under Main, not as another process.
- Contracts is platform-neutral. Agent Core, Browser Runtime, AI Providers and Persistence import Contracts; Utility composes runtime/provider implementations into Agent Core ports. Main imports Contracts/Persistence; Renderer/Preload import only Contracts among workspaces. No shared package imports desktop/private sibling sources or forms cycles.
- Root npm scripts remain the user entry points. Tests live in `apps/desktop/test` and `packages/*/test`; the later sign-in test fixture is under `apps/desktop/test/fixtures/sign-in`, not a new application workspace. See `spec.md > Approved Workspace Architecture`, `Process Ownership`, `Package Boundaries and Allowed Dependencies`, `Authorized Communication Paths`, and `Planned File Structure`.

## Slices

- [ ] **1. Launch the real Electron workspace and control its native browser**
  Becomes usable: The Windows application opens into its premium off-white workspace and honest New Audit empty state. Its actual product browser host supports a native shared Chromium view controlled through Playwright, with no duplicate or screenshot substitute.
  Why now: Includes bootstrapping while proving the browser kernel and desktop presentation immediately. Package the real shell/worker early so launch and distribution failures are discovered before building the rest.
  PRD ref: `prd.md > The Core Journey` (launch/workspace), `Workspace Layout and Observation UI`, `Real Live Browser Preview`, `Browser Control Ownership and Handoff`.
  Spec ref: `spec.md > Approved Workspace Architecture`, `Process Ownership`, `Desktop Host and Trusted Workspace`, `Native Browser, Session and Ownership`, `Stack and Process Layout`, `Planned File Structure`, `Where It Runs and How Someone Tries It`.
  Build: Once explicitly authorized, create the root npm Workspaces manifest/single lockfile and minimal desktop/shared workspace manifests; organize product source under the approved apps/packages tree. Configure desktop Electron/Vite/React/TypeScript/Tailwind/shadcn, root npm aliases and public Contracts exports. Main owns window, native browser/session/shield, authenticated CDP host and Utility supervision; Preload is typed/minimal, Renderer presents real empty/workspace states, and Utility uses Browser Runtime for Playwright attachment/actions. Bundle the Utility/workspace code with the desktop. A temporary owned localhost page in the actual-host smoke test proves exact native identity and independently observed normal Playwright effects; it is not an autonomous audit or the later sign-in acceptance fixture. Do not invent projects, activity, findings or completed checks. User-facing audit activation stays gated until setup and the real runtime are ready.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run apps/desktop/test/desktop.test.ts packages/contracts/test/contracts.test.ts`, `npm run build`, `npm run smoke:desktop`, `npm run package:win`, and `npm run smoke:packaged`. Verify actual desktop/Utility launch, Main native target identity, Browser Runtime execution inside Utility, independently observed DOM effects, validated IPC and absence of Renderer privileged imports. Verify packaged workspace/Utility resolution and cleanup; distinguish development/package observations.
  Learner check: Run `npm run dev`, inspect the launch/empty workspace, resize the window/panels and check the typography, spacing, sidebar and supporting-panel composition. Use `npm run smoke:desktop` to see the actual application host's browser test; its test page is explicitly labeled diagnostic and does not claim AI activity. Report what looks or behaves differently from the intended desktop experience.
  Commit: `Add launchable Electron workspace and native browser`

- [ ] **2. Configure BYOK and prepare an authorized audit locally**
  Becomes usable: Configure a real provider/model in the app, securely save the key, reopen the saved configuration, and prepare a localhost audit with validated fields, fresh consent and transparent preflight results. Projects/history have genuine local persistence rather than sample entries.
  Why now: Connects the launchable product to real credentials, a real target and local state before enabling autonomous actions; incorrect setup must not create running audits or empty saved sessions.
  PRD ref: `prd.md > New Audit Setup and Preflight`, `Target Authorization and Browser Boundaries`, `Sensitive Input Lifecycle`, `Local Projects, Sessions, and Reports`.
  Spec ref: `spec.md > Providers and Credentials`, `Data Model and Communication Contracts`, `The Core Journey Through the System`, `Desktop Host and Trusted Workspace`.
  Build: Implement SQLite/Drizzle repositories in Persistence executing only under Main; keep OS-backed safeStorage credentials in desktop Main. Renderer implements non-sensitive draft restoration, animated New Audit and Settings through typed IPC. AI Providers performs all four BYOK/model-capability checks in Utility, with Main supplying secrets privately and returning only safe configuration/check results to Renderer. Validate localhost port/path, goal, budgets and fresh unchecked authorization; show individual results, Retry Checks and the one-active-audit guard. Keep secrets out of drafts/events and preserve entered data on validation failure. Audit Start must not falsely report autonomous execution before slice 3 supplies Agent Core orchestration.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run apps/desktop/test/setup.test.ts apps/desktop/test/credentials.test.ts packages/persistence/test/storage.test.ts packages/ai-providers/test/providers.test.ts`, `npm run build`, and `npm run smoke:setup`. Verify Main-only SQLite/secure storage, no plaintext persistence/Renderer saved-key access, Utility provider request handling, draft/consent behavior, target rejection and restart/reload. Perform a real configured-provider tool-capability preflight; unavailable live checks remain unperformed, never passing by mock.
  Learner check: In the running app configure a provider/model, enter its key privately, test the connection, close/reopen the app and confirm the configured state returns. Prepare an audit and try invalid fields, dismissal/reopen and fresh consent. Never send the key in chat.
  Commit: `Add secure BYOK setup and local audit preparation`

- [ ] **3. Run an autonomous audit with real activity, TODOs and questions**
  Becomes usable: Start an authorized audit driven by the selected real model; observe actual tool execution and evolving TODOs in the embedded browser, answer structured questions and safely take/return browser control.
  Why now: Delivers the central autonomous user experience before adding final report polish. Model-driven behavior and UI synchronization are tested together rather than leaving the Agent kernel until the end.
  PRD ref: `prd.md > Autonomous Agent Activity Feed`, `Dynamic TODOs`, `Structured Clarifications Through ask_user`, `Browser Control Ownership and Handoff`, `Risk-based Action Permissions`, `Provider Connectivity and Automatic Recovery`, `Browser Failure Detection and Automatic Recovery`, `Autonomous Execution and Internal Cancellation`.
  Spec ref: `spec.md > Agent Runtime and Structured Questions`, `Shared Authorization and Action Policy`, `Native Browser, Session and Ownership`, `Execution Limits and Important Failure Modes`.
  Build: Compose Agent Core, Browser Runtime and AI Providers in desktop Utility. Agent Core owns the bounded ToolLoopAgent/business lifecycle, planning, TODOs, structured questions and classification workflow; Browser Runtime serializes/executes typed tools against Main's native guest. Main authorizes privileged leases/security, supervises Utility and validates/persists events through Persistence without duplicating orchestration. Preserve schema-validated normal/secret answers, distinct Skip/approval, exclusive ownership, risk policy/budgets, bounded request retry/basic recovery and truthful termination without replay/provider switching. Keep background navigation/global status independent. No prewritten transcript, fake reasoning or simulated model result drives the visible audit.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run packages/agent-core/test/runtime.test.ts packages/agent-core/test/questions.test.ts packages/agent-core/test/budgets.test.ts apps/desktop/test/policy.test.ts apps/desktop/test/ownership.test.ts packages/browser-runtime/test/tools.test.ts`, `npm run build`, and `npm run smoke:audit`. With a real provider, verify model-generated actions execute through Utility Browser Runtime on Main's actual guest, events/TODOs match real work, invalid answers stay pending, ownership excludes concurrent operations and denied/out-of-scope actions do not execute. Keep unit checks distinct from the live Agent result.
  Learner check: Start a small authorized audit against an owned localhost app. Watch the real browser/feed/TODOs, answer a question when requested, take/return control and inspect expanded tool details. Report confusing progress, ownership behavior or missing feedback before the evidence/report layer is finalized.
  Commit: `Run autonomous audits with tools questions and ownership`

- [ ] **4. Capture real evidence and reopen trustworthy local reports**
  Becomes usable: Actual execution produces sanitized evidence and conservatively classified findings; completed/blocked/interrupted audits reopen as read-only local overviews with real counts, TODOs, steps and evidence after restart.
  Why now: Adds the core proof of value to a working autonomous run. The evidence/verification pipeline consumes real tool records rather than fabricated report data.
  PRD ref: `prd.md > Evidence-Backed Findings`, `Contextual Findings and Dedicated Findings View`, `Read-only Audit Overview`, `Local Projects, Sessions, and Reports`, `Audit Outcomes and Coverage Limits`, `Sensitive Input Lifecycle`.
  Spec ref: `spec.md > Evidence, Findings and Local Reports`, `Data Model and Communication Contracts`, `Execution Limits and Important Failure Modes`.
  Build: Browser Runtime in Utility captures/sanitizes real screenshots/DOM and console/network summaries. Agent Core owns expectation/mismatch verification, safe independent Playwright reproduction via Browser Runtime, false-positive checks and classification. Main receives validated events/artifact payloads and performs all evidence/SQLite/report storage through Persistence. Renderer requests read-only overviews/artifacts by recorded IDs. Preserve Suspected/UX classifications, contextual/dedicated finding views, stable history, partial outcomes and next-launch Interrupted handling without resumed execution.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run packages/agent-core/test/verifier.test.ts packages/browser-runtime/test/evidence.test.ts packages/persistence/test/reports.test.ts`, `npm run build`, and `npm run smoke:history`. Check real capture → verification → validated Main persistence → read-only UI paths, downgrades for missing proof, secret exclusion, distinct partial outcomes and restart/reopen without execution. Do not label a unit-supplied finding a live verified result.
  Learner check: Review the findings and saved overview from an actual run, open evidence and reproduction details, restart the app, and reopen the same audit. Confirm classifications/counts remain honest and historical inspection does not launch execution.
  Commit: `Save real evidence verified findings and local reports`

- [ ] **5. Use optional WebMCP through the same product safety path**
  Becomes usable: Pages with suitable WebMCP tools can offer structured auxiliary actions while normal Playwright UX testing continues on every target, including pages with no WebMCP support.
  Why now: The primary audit loop already works, so this enhancement cannot become a dependency or a replacement for UI-based testing.
  PRD ref: `prd.md > Risk-based Action Permissions`, `Target Authorization and Browser Boundaries`, `Evidence-Backed Findings`; additive WebMCP decision in the approved technical spec.
  Spec ref: `spec.md > Optional Experimental WebMCP Adapter`, `Shared Authorization and Action Policy`, `Agent Runtime and Structured Questions`.
  Build: Implement Browser Runtime's bounded public Playwright discovery/invocation in Utility on the authorized native session. Keep main-frame availability, schema/metadata/result limits, source attribution and generation invalidation. Agent Core business policy and Main privileged security/ownership/one-operation approval gates apply exactly as for Playwright. Page instructions/hints remain untrusted and tools never skip intended UX interactions. Discovery failure falls back normally; uncertain invoked effects are inspected, not replayed. Defer an optional-adapter compatibility blocker without rebuilding the browser architecture.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run packages/browser-runtime/test/webmcp.test.ts`, `npm run build`, and `npm run smoke:webmcp`. Exercise the actual desktop/Utility/native-session path with an owned benign tool and independent effect observation, then a no-tools page/ordinary Playwright fallback. Assert common policy and preservation of visible UX tests. Unsupported optional capability stays honest; fallback success is not an invocation pass.
  Learner check: Inspect the optional capability indicator/tool attribution and confirm normal audits still work on a target without WebMCP. A UI flow audit should visibly exercise its controls rather than silently skip them through a tool.
  Commit: `Add optional policy-gated WebMCP enhancement`

- [ ] **6. Validate the complete real audit workflow and packaged application**
  Becomes usable: A functional Windows POC completes a real BYOK-driven goal against the later sign-in acceptance fixture, produces an independently reproduced evidence-backed finding and reopens its report locally from the packaged product.
  Why now: The fixture validates an already implemented general-purpose product instead of becoming sign-in-specific execution logic. This is the core acceptance gate before final learner review and any 6-ship work.
  PRD ref: `prd.md > The Core Journey`, `What We're Building`, `Evidence-Backed Findings`, `Established Acceptance Criteria`; `scope.md > Acceptance Fixture and Implementation Order`.
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `Focused Build Order and Done Criteria`, `Execution Limits and Important Failure Modes`.
  Build: Add the later minimal React sign-in fixture under apps/desktop/test/fixtures/sign-in at localhost:3000 with a seeded defect/explicit expectation; it is not another application workspace. Supply root npm aliases and a real acceptance runner across Renderer/Preload/Main/Utility and the five shared packages. Complete packaged Utility/workspace/native-SQLite distribution, core UI polish and actual-use errors. Proportionately validate denied/out-of-scope actions, secret outputs and Interrupted behavior. Keep goal-driven execution, without fixture-specific transcripts, fake findings or precomputed Agent plans. Demo publication/submission remains in 6-ship after acceptance/final review.
  Verify (mechanical): Run `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run package:win`, start `npm run fixture`, and run `npm run acceptance:packaged`. Record the actual provider/model (never key), target/goal, real model/tool events, independently reproduced expectation mismatch, safe artifacts and locally reopened report after app restart. An unavailable key or failed reproduction leaves acceptance incomplete; never replace the real run with a canned result.
  Learner check: Launch the packaged application, configure BYOK privately, audit the localhost sign-in flow, inspect the finding and evidence, close/reopen the app and review the saved audit. Explore awkward inputs and appearance freely and report what needs revision before confirming readiness.
  Commit: `Validate the packaged end-to-end audit workflow`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, inspect the real launchable desktop/native-browser experience and resolve useful visual/layout feedback before continuing.
- [ ] Integrated Agent behavior explored — after slice 3, use a real configured model and inspect activity, TODOs, questions and ownership; this supplies distinct runtime feedback before report finalization.
- [ ] Final kick-the-tires exploration and feedback completed — after slice 6's real acceptance run, explore the packaged core journey and agree on remaining small revisions.

## Final Review

- [ ] Real end-to-end acceptance passed with a configured provider, actual native browser execution, sufficient evidence/reproduction and local restart/reopen; results recorded without secrets.
- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

No final-review feedback has been collected yet. Add agreed fixes here as unchecked items, verify/commit each, and have the learner retry affected behavior. Do not start 6-ship before acceptance, final review and the learning wrap-up/app map are complete.

## Code Tour and App Map

- [ ] Learning activity complete — use one actual orchestration/evidence-verification boundary from the completed app for a concise experienced-developer investigation or connect useful practice already performed during the build.
- [ ] Optional edit and transfer reflection addressed — offer once after final revisions; declining is sufficient.
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse.

Activity and evidence: Not yet performed; record actual code/test references after final review rather than inferring learning from this plan.
Route and stops: Select from the actual finished app's tool dispatch, native browser effect and verifier/report path; no code tour is claimed yet.
Edit outcome: Not yet offered.
Reflection: Not yet offered; personal reflection belongs only in the ignored learner profile.
Activity mode: Not yet performed; use a focused experienced-developer investigation or connect prior verified practice once available.

## Revisions

- Approved npm Workspaces organization recorded before implementation — move the target source layout into apps/desktop and exactly five shared packages; run Agent Core/Browser Runtime/AI Providers in Utility while Main retains native/security/credential/Persistence ownership. Preserve the approved six-slice sequence and product requirements; implementation remains unstarted and requires explicit authorization.
