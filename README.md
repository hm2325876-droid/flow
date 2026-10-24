# FlowProof AI

A local-first Windows desktop workspace for evidence-based browser audits. **Slice 1 is implemented:** a real Electron application, premium off-white React shell, isolated native Chromium view, and Utility-process Playwright control of that exact visible session.

This version is the desktop/browser foundation, not an autonomous AI auditor yet. It contains no simulated agent activity, completed TODOs, sample projects, fabricated findings, provider calls or audit-history database.

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

**New audit** and **Settings** honestly describe the later BYOK/audit capabilities. `Ctrl+N` opens the New Audit introduction. Sidebar collapse, workspace/findings navigation, panel resizing, browser enlargement and native Windows titlebar controls work.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run smoke:desktop
npm run smoke:dev-server
```

The development smoke launches the built, unpackaged application. The dev-server smoke executes the actual root `npm run dev` path. Both use a private, nonce-authenticated opt-in test transport with a fixed command allowlist—no generic evaluation API is exposed to Renderer or website content.

The smoke checks actual React rendering and preload keys, a separate Utility PID, target-ID/native-WebContents identity, concurrent connection exclusion, scoped transport authorization, real DOM/screenshot effects, native bounds after resizing, native mouse/keyboard exclusion, localhost/redirect/popup blocking, configurable initial path, and Main/Utility cleanup. Native messages target only the verified owned process/window. Guarded `SendInput` aborts rather than touching another application or releasing a user's modifiers; an aborted test is UNVERIFIED, never PASS.

Reports, app test profiles and PNGs are generated under `test-results/slice1/` and ignored by Git. The portable checkpoint summary is [`devpost/slice-1-results.json`](devpost/slice-1-results.json). Earlier failed/inconclusive runs remain local historical records rather than being rewritten as successful.

## Package Windows x64

```powershell
npm run package:win
npm run smoke:packaged
```

Default output: `apps/desktop/dist/win-unpacked/FlowProof AI.exe`. Keep **the entire sibling folder**, including DLLs and `resources/app.asar`; copying the EXE alone is not a distribution.

The checkpoint's verified **current-code** copy is:

```text
apps/desktop/dist/slice1-final/win-unpacked/FlowProof AI.exe
```

A manually opened older copy was locking the default output during the final rebuild. It was left running; the current candidate was built side-by-side with the same configuration:

```powershell
npm run build
npm run package:win --workspace @flowproof/desktop -- --config.directories.output=dist/slice1-final
$env:FLOWPROOF_PACKAGED_EXE = "$PWD/apps/desktop/dist/slice1-final/win-unpacked/FlowProof AI.exe"
npm run smoke:packaged
```

Close a running output copy before rebuilding into its folder on Windows. `FLOWPROOF_PACKAGED_EXE` only selects the smoke-test executable; it does not affect normal application behavior.

Packaged Main, Preload, Renderer and Utility resources run from ASAR with no development server or separately installed Node. A restricted `flowproof-app://workspace/` handler serves compiled Renderer assets. The sandboxed CommonJS preload is self-contained. Workspace code is bundled, while Playwright Core/WS remain explicit packaged runtime dependencies. ASAR-only loading is enabled; RunAsNode, NodeOptions, Node CLI inspection and extra file-protocol privileges are disabled. Signing, installers, update lifecycle and advanced integrity enforcement are deferred. No native SQLite dependency exists in this slice; native rebuild configuration must be enabled when Persistence is implemented.

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
      smoke-control.ts            # opt-in authenticated mechanical-test commands only
      browser/
        host.ts                   # native guest/session/input shield
        cdp-bridge.ts             # authenticated guest-scoped native-debugger transport
        policy.ts                 # origin, bounds and exclusive-operation gate
        validation-page.ts        # owned loopback mechanics page, not an AI audit fixture
    preload/index.ts              # seven narrow typed APIs
    renderer/                     # actual React desktop shell, styles and shadcn-style button
    utility/index.ts              # validated browser-runtime request entry
  test/
    desktop.test.ts
    smoke.mjs
    native-input.ps1
packages/
  contracts/                      # Zod schemas, serializable messages, typed preload API
  browser-runtime/                # Playwright connection/checks inside Utility
package.json / package-lock.json  # npm Workspaces, regular local version references
tsconfig.base.json / tsconfig.json / vitest.config.ts
devpost/                          # approved plans, checklist, checkpoint summary
```

Agent Core, AI Providers and Persistence remain approved future package boundaries; no empty source boilerplate was generated for them. Their implementations belong to later slices.

## Pinned implementation dependencies

Electron 45.0.0 · Playwright Core 1.64.1 · React/React DOM 19.2.0 · TypeScript 5.9.3 · Tailwind CSS 4.1.18 · electron-vite 6.0.0 · electron-builder 26.15.3 · Zod 4.3.6 · Vitest 4.0.18 · WS 8.22.0. The desktop declares Vite 7.3.1; electron-vite's compatible resolved build engine is 7.3.7. The single root lockfile records the complete reproducible dependency graph.

## Security and scope

- Main owns windows/native sessions, application lifecycle and privileged IPC. Utility owns the Playwright client; Renderer receives no connection token, raw IPC function, Node API or debugging interface.
- Workspace and guest both use context isolation and sandboxing with Node integration disabled. Guest has no privileged preload. Requests/navigation are confined to the exact authorized `http://localhost:<port>` origin; popups, downloads/device permissions and non-GET/HEAD guest requests are denied in this foundation.
- One visible audit guest/session exists per connection. Connect/disconnect lifecycle reservations occur before the first await; overlapping requests are rejected. Connection replacement closes the prior client/views and issues fresh scoped capabilities.
- A separate transparent trusted native shield reserves input while CDP still targets the guest. Tested native mouse/keyboard events do not mutate guest values during actual Playwright work. This is bounded Windows evidence, not universal hardware/IME/accessibility validation.
- Screenshots are generated only by the explicitly owned mechanics check in this slice. No API keys are requested or stored. Diagnostic captures are not findings or audit reports.

Full BYOK, autonomous planning, dynamic TODOs, structured questions, evidence-based findings, SQLite history, full Take/Return handoff and WebMCP integration are deliberately unimplemented. Broader CDP/worker/IME/touch/accessibility coverage and human hands-on sign-off remain unverified. **Slice 2 and 6-ship have not started.**
