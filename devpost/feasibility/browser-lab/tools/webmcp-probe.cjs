// One bounded capability check in the existing packaged native guest. No bridge changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const executable = path.join(root, 'out/win-unpacked/FlowProof Feasibility Lab.exe');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = { schema_version: 1, stage: 'webmcp', started_at: new Date().toISOString(), command: 'node tools/webmcp-probe.cjs', setup: { host: 'Existing packaged WebContentsView + authenticated scoped CDP bridge', feature_flag: '--enable-features=WebMCP', playwright: require('playwright-core/package.json').version, target: 'Synthetic owned localhost page; one benign DOM-marker tool', bridge_modified: false }, tests: [], decision: 'DEFERRED', limitations: ['Bounded capability check, not a complete WebMCP security assessment.', 'Page metadata/results are untrusted. Marker tool is explicitly owned diagnostic code, not proof of arbitrary-tool safety.', 'No browser-architecture change, physical-input matrix, or additional feasibility campaign.'] };
let child, pipe, control, server, browser, ready, sequence = 0;
const pending = new Map();
const sensitive = new Set();
const wait = async fn => { const until = Date.now() + 18000; while (Date.now() < until) { const result = fn(); if (result) return result; await new Promise(r => setTimeout(r, 30)); } throw new Error('Bounded probe setup timed out'); };
const rpc = (command, args = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error('Probe RPC timeout')); }, 6000); pending.set(id, { resolve, reject, timer }); control.write(JSON.stringify({ id, command, ...args }) + '\n'); });
const record = (id, expected, observed, status = 'PASS') => report.tests.push({ id, setup: report.setup, expected, observed, status, limitations: report.limitations });
function markup(register) {
  return `<!doctype html><meta charset="utf-8"><title>Owned WebMCP capability check</title><h1>Native WebMCP check</h1><button id="agent-button" onclick="document.querySelector('#agent-count').textContent++">Increment visible marker</button><output id="agent-count">0</output><script>
    const modelContext = navigator.modelContext || document.modelContext;
    window.probeRegistration = 'absent';
    if (${register} && modelContext && typeof modelContext.registerTool === 'function') {
      try { Promise.resolve(modelContext.registerTool({ name: 'set_demo_marker', description: 'Owned diagnostic only: change the visible marker to a supplied integer.', inputSchema: { type: 'object', properties: { value: { type: 'integer' } }, required: ['value'], additionalProperties: false }, execute: async ({ value }) => { document.querySelector('#agent-count').textContent = String(value); return { content: [{ type: 'text', text: String(value) }] }; } })).then(() => window.probeRegistration = 'registered').catch(e => window.probeRegistration = e.name); } catch (e) { window.probeRegistration = e.name; }
    }
  </script>`;
}
(async () => {
  try {
    assert.ok(fs.existsSync(executable), 'Build the existing lab before this probe');
    report.artifacts = { executable_sha256: hash(executable), asar_sha256: hash(path.join(root, 'out/win-unpacked/resources/app.asar')), probe_sha256: hash(__filename) };
    server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.setHeader('Cache-Control', 'no-store'); res.end(markup(!req.url.includes('tools=0'))); });
    await new Promise(resolve => server.listen(0, 'localhost', resolve));
    const target = `http://localhost:${server.address().port}/`;
    const pipeName = `\\\\.\\pipe\\flowproof-webmcp-${crypto.randomUUID()}`;
    const bootstrap = crypto.randomBytes(32).toString('hex'); sensitive.add(bootstrap);
    pipe = net.createServer(socket => {
      let buffer = '', authenticated = false;
      socket.on('error', () => {});
      socket.on('data', data => { buffer += data; let end; while ((end = buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
        if (!authenticated) { if (message.event !== 'hello' || message.token !== bootstrap || control) { socket.destroy(); return; } authenticated = true; control = socket; continue; }
        if (message.event === 'ready') ready = message.data;
        if (message.event === 'fatal') report.host_error = message.data.message;
        const p = pending.get(message.id); if (p) { clearTimeout(p.timer); pending.delete(message.id); message.error ? p.reject(new Error(message.error)) : p.resolve(message.result); }
      } });
    });
    await new Promise(resolve => pipe.listen(pipeName, resolve));
    const env = { ...process.env, FP_LAB_TARGET: target, FP_LAB_PIPE: pipeName, FP_LAB_BOOTSTRAP: bootstrap, FP_LAB_PROFILE: path.join(os.tmpdir(), 'opencode', `flowproof-webmcp-${crypto.randomUUID()}`) }; delete env.ELECTRON_RUN_AS_NODE; delete env.NODE_OPTIONS;
    child = spawn(executable, ['--enable-features=WebMCP'], { cwd: root, env, stdio: ['ignore', 'ignore', 'ignore'] });
    await wait(() => ready);
    report.runtime = { ...ready.runtime, isPackaged: ready.isPackaged, asar: ready.asar };
    const connection = await rpc('connection'); sensitive.add(connection.token);
    browser = await chromium.connectOverCDP(connection.endpoint, { headers: { Authorization: 'Bearer ' + connection.token }, noDefaults: true, timeout: 10000 });
    const page = browser.contexts().flatMap(context => context.pages()).find(page => page.url() === target);
    assert.ok(page); page.setDefaultTimeout(3000);
    const session = await browser.newBrowserCDPSession();
    const { targetInfos } = await session.send('Target.getTargets');
    const identity = await rpc('identity', { targetId: targetInfos[0].targetId });
    assert.equal(targetInfos.length, 1); assert.equal(identity.mapped, identity.guest);
    record('same-displayed-native-session', 'Exactly one audit target maps to the displayed native WebContents', { targetCount: 1, identityMatches: true });
    const lease = await rpc('begin');
    try {
      const availability = await page.evaluate(() => ({ secureContext: isSecureContext, navigatorAPI: typeof navigator.modelContext, documentAPI: typeof document.modelContext, registration: window.probeRegistration }));
      record('native-api-detection', 'Observe actual browser API availability rather than infer it from Playwright version', { ...availability, playwrightWebMCP: !!page.webmcp });
      try {
        const tools = await page.webmcp.tools({ timeout: 3000 });
        const tool = tools.find(tool => tool.name === 'set_demo_marker');
        assert.ok(tool, 'Owned marker tool was not discovered');
        const result = await page.webmcp.callTool(tool.name, { value: 42 }, { timeout: 3000 });
        const native = await rpc('read'); assert.equal(native.agentCount, 42);
        record('playwright-webmcp-discover-call', 'Discover and invoke the registered tool using public Playwright APIs; independent native DOM equals 42', { toolDiscovered: true, result, independentlyObservedMarker: native.agentCount });
        report.decision = 'AVAILABLE_EXPERIMENTAL';
      } catch (error) {
        record('playwright-webmcp-discover-call', 'Discover and invoke through the existing scoped attachment without rebuilding it', { error: error.message, nativeAvailability: availability }, 'UNSUPPORTED');
      }
      const before = (await rpc('read')).agentCount;
      await page.getByRole('button', { name: 'Increment visible marker' }).click();
      assert.equal((await rpc('read')).agentCount, before + 1);
      await page.goto(target + '?tools=0');
      await page.getByRole('button', { name: 'Increment visible marker' }).click();
      assert.equal((await rpc('read')).agentCount, 1);
      record('playwright-fallback', 'Normal Playwright works after detection and on a page without registered tools', { afterDetectionClickObserved: true, noToolsPageClickObserved: true, independentlyObservedMarker: 1 });
      await rpc('finish', { lease, outcome: 'observed-complete' });
    } catch (error) { await rpc('finish', { lease, outcome: 'unknown' }).catch(() => {}); throw error; }
  } catch (error) { report.fatal = error.message; report.decision = 'DEFERRED'; process.exitCode = 1; }
  finally {
    await browser?.close().catch(() => {});
    if (control) await rpc('quit').catch(() => {});
    if (child && child.exitCode === null) await new Promise(resolve => { const timer = setTimeout(() => { child.kill(); resolve(); }, 4000); child.once('exit', () => { clearTimeout(timer); resolve(); }); });
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Probe cleanup')); }
    control?.destroy(); pipe?.close(); server?.closeAllConnections(); server?.close();
    report.finished_at = new Date().toISOString();
    const output = path.resolve(root, '../runs', report.started_at.replace(/[:.]/g, '-') + '-webmcp.json');
    let encoded = JSON.stringify(report, null, 2); for (const value of sensitive) encoded = encoded.replaceAll(value, '[REDACTED]');
    fs.writeFileSync(output, encoded + '\n');
    console.log(JSON.stringify({ report: output, decision: report.decision, tests: report.tests.map(t => ({ id: t.id, status: t.status, observed: t.observed })), fatal: report.fatal || null }, null, 2));
  }
})();
