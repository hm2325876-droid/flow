# FlowProof AI — bounded 4-spec browser lab

This is a reproducible diagnostic integration, not the FlowProof application or a `5-build` implementation. The approved PRD remains unchanged and the architectural candidate stays provisional.

The learner's 2026-10-24 direction is to build the small working POC using the demonstrated integration. The historical matrix is supporting evidence, not a prerequisite campaign to repeat before development. See `../../spec.md` for the current build-ready proposal.

## Requirements and commands

- Windows 11 x64, Node.js 24-compatible toolchain, PowerShell 7 (`pwsh`), and a desktop session for OS-input cases.
- Pinned Electron 45.0.0, Playwright Core 1.64.1, ws 8.22.0, electron-builder 26.15.3, and @electron/fuses 2.1.3 are recorded in `package-lock.json`.
- From this directory:

```powershell
npm ci --no-audit --no-fund
node tools/contracts-report.cjs
npm run test:dev
npm run build:win
npm run test:packaged
npm audit --json
```

The package command builds `out/win-unpacked/FlowProof Feasibility Lab.exe` with `resources/app.asar`. It is an unsigned unpacked Windows application folder, not an installer or a signed production release. Do not commit `out/` or `node_modules/`; their local ignore rules are included. First use can require an Electron binary download.

## Evidence and interpretation

Each execution writes a timestamped JSON report in `../runs/`, containing stage, exact command, runtime versions, target URL, source hashes, and per-case setup, expected result, observed result, event evidence, limitations, and PASS/FAIL/INCONCLUSIVE status. Packaged reports also hash the actual executable/ASAR, compare archived host/bridge/coordinator hashes, and compare runtime package identity/dependencies; builder intentionally strips development-only manifest fields. Global limitations apply to every case in addition to its own limitations array.

Native DOM reads and an independent local server ledger verify effects. A resolved Playwright call is never the success criterion on its own. Raw broker/bootstrap tokens and synthetic authentication-cookie values are excluded and checked for redaction before reports are saved. The append-only diagnostic history retains unknown/stale operation outcomes; it is not the full product audit database.

Reports are historical observations. Older reports retain genuine failures, harness defects, and inconclusive conditions; later summaries identify superseded runs rather than rewriting them. Successful process exit means no FAIL case, not that every mandatory gate passed: INCONCLUSIVE cases keep the overall gate OPEN.

For the self-contained authorization regression only, set `$env:FP_LAB_ONLY='security-cdp-unauthorized'` before `npm run test:dev`; remove that process-local variable for the complete suite. Other cases may require earlier setup and must not be selected in isolation without establishing their documented preconditions. Selected-case reports identify that selection and are never counted as a full-suite result.

### Bounded optional WebMCP check

`node tools/webmcp-probe.cjs` launches the existing packaged host with `--enable-features=WebMCP`, uses public Playwright 1.64.1 discovery/invocation on that exact native guest, independently observes a harmless DOM marker, and checks ordinary Playwright/no-tools fallback. It writes a timestamped `*-webmcp.json` record. It does not modify the bridge, run the broad input matrix, or use provider credentials. The measured check succeeded; this Chromium exposes `document.modelContext`, not `navigator.modelContext`. Target tooling remains optional and untrusted.

## Native input conditions

The native helper uses Win32 `SendInput` through the Windows input route, not CDP or `webContents.sendInputEvent`. It establishes per-monitor-v2 coordinates and verifies the input point belongs to the owned diagnostic window before injecting. The diagnostic window may be temporarily always-on-top and activated through its own title bar. These are lab setup conditions, not selected product UX.

For a repeatable OS-input run, leave the diagnostic window unobscured and avoid moving the pointer or holding modifier keys during the short native-input cases. The helper aborts or returns INCONCLUSIVE if foreground, owned hit-test, modifiers, or pointer position cannot be established. It never releases user-held keys, targets another application, or counts an unperformed action as a pass. Actual human hardware, IME composition, touch, accessibility, drag/drop, multiple monitors, and the full DPI matrix require separate validation.

## Attachment and permission scope

The lab has one real audit WebContentsView, a trusted shell, and a trusted transparent native input shield. The shield is attached above the guest during Agent/Pending/Returning/recovery and removed during User control; it is not a second audit browser or a screenshot view.

CDP is carried by a guest-scoped, authenticated WebSocket bridge backed by the displayed guest's native Electron debugger. This is a provisional CDP attachment variant. It removes the unrestricted Chromium debug switch, scopes target enumeration/attachment, binds storage APIs to the actual Electron partition, rejects browser-origin/unauthenticated clients, and rotates access on recovery. The controller pipe uses a per-launch nonce. OOPIF/worker protocol routing, the full CDP surface, and production threat-model coverage are not complete.

The native network policy uses a fixed trusted diagnostic effect catalog, distinguishing known low-risk authentication, one-operation approval, hard restriction, and unknown effects (including a side-effecting GET). This demonstrates enforcement in both ownership modes for that catalog; it does not infer arbitrary application's business semantics. The host exposes narrow diagnostic RPCs solely for controlled setup and independent observation, not as a model-facing product API.

## Layout

```text
src/ownership.cjs          # Exclusive operation leases and inspected recovery/return gates
src/cdp-bridge.cjs         # Scoped protocol subset and partition-bound cookie adapter
src/host.cjs               # Native guest/shield, origin/effect policy, lifecycle and diagnostic RPC
test/contracts.test.cjs    # Real state-machine assertions (no browser mocks)
test/native-input.ps1      # Owned-window Win32 input helper; records its limitations
test/run.cjs               # Local server ledger and development/packaged observable-effect suite
tools/fuses.cjs            # Packaging-time fuse configuration
tools/contracts-report.cjs # Durable per-contract TAP evidence
```

No AI provider keys, real test credentials, real financial actions, existing user projects, or external target websites are used. Full implementation and `5-build` remain gated on the completed technical specification and explicit approval.
