# FlowProof AI

A local-first Windows desktop workspace for evidence-based browser audits. **Slice 2 is implemented:** real Models.dev discovery, six registered AI SDK adapters, Windows-protected BYOK, and an authorized localhost audit setup wizard. The native Chromium/Utility-process Playwright foundation from Slice 1 is preserved.

This version prepares a verified configuration for future Agent Core execution. Autonomous audits arrive in Slice 3. It creates no fake sessions, synthetic activity, sample projects or findings; SQLite currently stores only non-sensitive settings/drafts/catalog metadata.

## Run

Requirements: Windows 11 x64, Node 24+ and npm 11+. PowerShell 7 is needed for the native-input smoke tests, not ordinary application launch. First development launch may download Electron's pinned binary.

```powershell
npm ci
npm run dev
```

In the app:
1. Open **Workspace** or **Explore the browser workspace**.
2. Select **Connect local browser**, enter your authorized localhost port/path, and explicitly confirm permission. The preview is currently read-only/Agent-reserved.
3. Alternatively, select **Open validation page**. It serves a small owned loopback-only mechanics page and displays it in the actual application browser.
4. **Run check** performs real Playwright navigation, button click, input fill, DOM observation and PNG capture inside the Utility process. Main independently reads the native DOM and verifies target identity before reporting success.

**New audit** (`Ctrl+N`) opens the complete setup wizard; **Settings** opens AI connections. Opening AI connections refreshes the live Models.dev **Providers** page while retaining an explicitly cached snapshot. Search and select a provider, browse only its models, inspect original IDs and advertised tools/structured output/reasoning/modalities, then select an executable model. Add or reuse its protected key and select **Test connection**, then **Verify agent tools**. Basic connectivity alone does not grant audit readiness. Configure the project, testing goal, optional context, localhost port/path and limits. Review runs real readiness checks and requires fresh explicit target authorization. **Prepare ready-to-run configuration** rechecks the gates and produces a typed handoff; it does not run an audit. A returning configured user can continue a saved draft, with fresh consent and checks.

Catalog discovery is broad; only installed/registered adapters execute. Missing/stale metadata remains explicit. With no network and no saved catalog, the UI shows an actionable retry error rather than invented models. New selections must match the normalized catalog; an existing saved selection remains reusable during a catalog outage. Search/filtering never sends model requests. Non-sensitive drafts save locally; closing setup invalidates preflight and clears consent. Stored keys are never displayed or returned to Renderer.

Sidebar collapse, workspace/findings navigation, panel resizing, browser enlargement and native Windows titlebar controls remain available.

## Slice 2 provider revision

AI connections now navigates Providers → that provider’s models → model details and protected key setup. Back navigation preserves provider/search context. Six reviewed Models.dev logos are bundled locally; other catalog providers use initials. Exact catalog IDs remain separate from labels and are validated by Main before persistence. Connection and tool checks have separate results and bounded deadlines (20 and 30 seconds); ordinary provider charges may apply. Provider errors expose only fixed categories, stages, observed HTTP status and whitelisted SDK error classes. Malformed provider responses and invalid/inconclusive tools never become Ready.

If a check fails, copy the displayed **phase/stage/category/HTTP/SDK class** and exact provider/model IDs for diagnosis; do not copy keys, headers or raw responses. A valid authorized key was not used for revision verification, so authenticated live success remains UNVERIFIED. Revision outcomes and remaining verification limits are recorded in [`slice-2-provider-revision-results.json`](devpost/slice-2-provider-revision-results.json).

### Earlier Slice 2 connection fix

Manual testing after `417ac44` exposed a catalog-row selection bug: full model metadata was sent to a strict identifier-only bridge contract, which rejected it before Main/Utility/provider execution. Selection now sends only `providerId` and `modelId`; strict validation remains enabled. Close any older FlowProof copy and launch the updated `apps/desktop/dist/slice2-provider-first/win-unpacked/FlowProof AI.exe`, or rebuild/run development. Saved protected keys remain Main-owned and can be reused without displaying their values.

The regression now clicks an actual catalog row and the actual Test connection button. Packaged selection persists and real invalid-key provider errors display safely without a stuck spinner. Internal bridge failures have distinct request/IPC/response codes; diagnostics contain only fixed stage/code metadata. Valid-key authenticated inference remains unverified. Exact red/green evidence: [`slice-2-connection-fix-results.json`](devpost/slice-2-connection-fix-results.json).

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run smoke:desktop
npm run smoke:dev-server
npm run smoke:setup
npm run smoke:setup:dev-server
```

The development smoke launches the built, unpackaged application. The dev-server smoke executes the actual root `npm run dev` path. Both use a private, nonce-authenticated opt-in test transport with a fixed command allowlist—no generic evaluation API is exposed to Renderer or website content.

The smoke checks actual React rendering and preload keys, a separate Utility PID, target-ID/native-WebContents identity, concurrent connection exclusion, scoped transport authorization, real DOM/screenshot effects, native bounds after resizing, native mouse/keyboard exclusion, localhost/redirect/popup blocking, configurable initial path, and Main/Utility cleanup. Native messages target only the verified owned process/window. Guarded `SendInput` aborts rather than touching another application or releasing a user's modifiers; an aborted test is UNVERIFIED, never PASS.

Reports, app test profiles and PNGs are generated under `test-results/slice1/` and ignored by Git. The portable checkpoint summary is [`devpost/slice-1-results.json`](devpost/slice-1-results.json). Earlier failed/inconclusive runs remain local historical records rather than being rewritten as successful. Slice 2 reports and UI captures are under `test-results/slice2/`; the portable result summary is [`devpost/slice-2-results.json`](devpost/slice-2-results.json). Setup smoke uses clearly invalid synthetic key placeholders to test actual OS encryption and invalid authentication. Successful authenticated connectivity/tool calling remains UNVERIFIED without a valid authorized test key. Isolated SDK responses test the successful protocol and handoff without claiming live success.

## Package Windows x64

```powershell
npm run package:win
npm run smoke:packaged
```

Default output: `apps/desktop/dist/win-unpacked/FlowProof AI.exe`. Keep **the entire sibling folder**, including DLLs and `resources/app.asar`; copying the EXE alone is not a distribution.

The Slice 2 checkpoint's **current-code** side-by-side output is:

```text
apps/desktop/dist/slice2-provider-first/win-unpacked/FlowProof AI.exe
```

Build a separate candidate with the same packaging configuration:

```powershell
npm run build
npm run package:win --workspace @flowproof/desktop -- --config.directories.output=dist/slice2-provider-first
$env:FLOWPROOF_PACKAGED_EXE = "$PWD/apps/desktop/dist/slice2-provider-first/win-unpacked/FlowProof AI.exe"
npm run smoke:packaged
npm run smoke:setup:packaged
```

Close a running output copy before rebuilding into its folder on Windows. `FLOWPROOF_PACKAGED_EXE` only selects the smoke-test executable; it does not affect normal application behavior.

Packaged Main, Preload, Renderer and Utility resources run from ASAR with no development server or separately installed Node. A restricted `flowproof-app://workspace/` handler serves compiled Renderer assets. The sandboxed CommonJS preload is self-contained. Workspace code is bundled, while Playwright Core/WS remain explicit packaged runtime dependencies. ASAR-only loading is enabled; RunAsNode, NodeOptions, Node CLI inspection and extra file-protocol privileges are disabled. Signing, installers, update lifecycle and advanced integrity enforcement are deferred. Main uses Node’s bundled `node:sqlite` through the documented Drizzle SQLite proxy for the settings-only database; no third-party native SQLite addon or ABI rebuild is needed.

## Actual source organization

```text
apps/desktop/
  package.json
  electron.vite.config.ts
  electron-builder.yml
  resources/fuses.cjs
  src/
    main/
      index.ts                    # lifecycle, IPC, trusted app assets, browser orchestration
      agent-supervisor.ts         # supervises the real Utility process
      setup.ts / credentials.ts   # readiness gates and Main-only OS-protected keys
      smoke-control.ts            # opt-in authenticated mechanical-test commands only
      browser/
        host.ts                   # native guest/session/input shield
        cdp-bridge.ts             # authenticated guest-scoped native-debugger transport
        policy.ts                 # origin, bounds and exclusive-operation gate
        validation-page.ts        # owned loopback mechanics page, not an AI audit fixture
    preload/index.ts              # narrow typed browser/setup APIs
    renderer/                     # actual React desktop shell, styles and shadcn-style button
    utility/index.ts              # validated browser/provider request entry
  test/
    desktop.test.ts
    smoke.mjs
    native-input.ps1
packages/
  contracts/                      # Zod schemas, serializable messages, typed preload API
  browser-runtime/                # Playwright connection/checks inside Utility
  ai-providers/                   # Models.dev catalog, fixed adapter registry and tool preflight
  persistence/                    # settings-only SQLite/Drizzle under Main
package.json / package-lock.json  # npm Workspaces, regular local version references
tsconfig.base.json / tsconfig.json / vitest.config.ts
devpost/                          # approved plans, checklist, checkpoint summary
```

Agent Core remains a planned package boundary; no empty implementation was created. Full audit history, evidence/reports and autonomous orchestration remain later work.

### Implemented Slice 2 provider path

Models.dev supplies catalog-driven provider/model discovery and advisory metadata: identifiers, display names, tool calling, structured output, reasoning, and input/output modalities where available, plus limits/pricing. Vercel AI SDK supplies provider integration and execution through adapters actually installed and registered in trusted application code. This replaces the restriction to four hardcoded providers; the real registry contains OpenAI, Anthropic, Google Gemini, OpenRouter (official OpenAI-compatible adapter at a fixed reviewed URL), DeepSeek and Groq. Provider/model IDs remain separate, including native aggregator namespaces.

`packages/ai-providers` owns discovery/search/filter/cache/offline fallback, supported versus unverified status, adapter resolution and separate actual connectivity (one request, 20 seconds) and tool-round-trip checks (at most two requests, 30 seconds), with automatic retries disabled. Audit preflight reuses fresh matching results; at most three small model requests establish both stages. Main retains encrypted keys and cache persistence; Utility executes SDK requests; Renderer never receives stored key values. No metadata-triggered package installs, arbitrary catalog endpoints/code or universal-compatibility promise. Full autonomous execution remains Slice 3. See [`spec.md > Providers and Credentials`](devpost/spec.md#providers-and-credentials) and the amended checklist. Fresh successful readiness is reused for five minutes within an uninterrupted setup and invalidated by dismissal/restart/configuration changes. Catalog refresh failures do not invalidate otherwise valid readiness. Provider errors are fixed safe messages; telemetry/raw SDK warnings are disabled. Main stores only OS-encrypted ciphertext in `provider-vault.json` and non-sensitive settings in `flowproof.sqlite`. Neither authorization nor prepared handoffs are persisted. Secure-storage failure blocks key save/use with no plaintext fallback.

## Pinned implementation dependencies

Electron 45.0.0 · Playwright Core 1.64.1 · React/React DOM 19.2.0 · TypeScript 5.9.3 · Tailwind CSS 4.1.18 · electron-vite 6.0.0 · electron-builder 26.15.3 · Zod 4.6.7 · Vitest 4.1.12 · WS 8.22.0. Vite is 7.3.7. Slice 2 uses AI SDK 7.0.153 and Drizzle 0.45.4; exact adapter versions are in `packages/ai-providers/package.json`. Compatible Zod/Vite/Vitest security patches were applied; the final production audit reports zero advisories. The single root lockfile records the complete reproducible dependency graph.

## Security and scope

- Main owns windows/native sessions, application lifecycle and privileged IPC. Utility owns the Playwright client; Renderer receives no connection token, raw IPC function, Node API or debugging interface.
- Workspace and guest both use context isolation and sandboxing with Node integration disabled. Guest has no privileged preload. Requests/navigation are confined to the exact authorized `http://localhost:<port>` origin; popups, downloads/device permissions and non-GET/HEAD guest requests are denied in this foundation.
- One visible audit guest/session exists per connection. Connect/disconnect lifecycle reservations occur before the first await; overlapping requests are rejected. Connection replacement closes the prior client/views and issues fresh scoped capabilities.
- A separate transparent trusted native shield reserves input while CDP still targets the guest. Tested native mouse/keyboard events do not mutate guest values during actual Playwright work. This is bounded Windows evidence, not universal hardware/IME/accessibility validation.
- Provider keys entered by the user temporarily traverse Renderer → validated Preload/Main input, then are OS-encrypted. Main releases stored keys only for the selected trusted Utility adapter; no stored-key read API exists. Provider origins are pinned in code and redirects are rejected. Catalog data cannot select endpoints, environment variables, executable packages or permissions. Diagnostic/UI captures are not findings or audit reports.

Autonomous planning, dynamic TODOs, structured questions, evidence-based findings, full audit history, Take/Return handoff and WebMCP integration remain unimplemented. Broader CDP/worker/IME/touch/accessibility coverage and human hands-on sign-off remain unverified. Guarded OS-input smoke may report UNVERIFIED if another window obscures the owned activation point; it does not interact with that window. **Stop after Slice 2; Slice 3 and 6-ship require separate authorization.**
