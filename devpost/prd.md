---
doc: prd
status: approved
---

# FlowProof AI — Product Requirements

A local-first Windows desktop AI agent for designers and developers to audit user-defined flows in localhost web applications, observe real autonomous execution, and inspect evidence-backed findings.

Source: `scope.md > The Unique Kernel` and `scope.md > Who It's For`.

**Approved PRD:** The learner explicitly approved FlowProof AI and all documented product requirements. `3-prd` is complete, and progression to the official `4-spec` workflow is authorized. Product decisions remain unchanged. Native shared-browser feasibility must be validated during technical specification; full implementation remains gated on a completed and approved technical specification.

## The Core Journey

Source: `scope.md > The Core Loop` and `scope.md > Mandatory PRD Requirements`.

1. Open FlowProof AI into a polished startup experience and, on first launch, a New Audit empty state. No FlowProof AI account is required.
2. When no audit is active, select New Audit to open a premium animated setup overlay. First-time users connect an AI provider, enter their API key, choose a model, and validate the configuration before proceeding. The key is stored securely using OS-backed storage.
3. Configure the audit with a non-empty human-readable project name, a valid port for the fixed `http://localhost` host, and a non-empty user-defined audit goal. The initial URL path defaults to `/`; project description is optional but recommended. Explicitly confirm ownership/permission and authorization for this audit through an unchecked-by-default confirmation. Validate all required fields before proceeding.
4. Enter Review & Start to automatically check provider/model connectivity, localhost availability, explicit authorization, and execution-budget settings. Show the exact resolved target URL, project name, and audit goal, with individual Checking/Passed/Failed results and actionable Retry Checks on failure. Start Audit stays disabled until all required checks pass; critical conditions are revalidated immediately before activation. Dismissal preserves a non-sensitive draft for continuation or Start Fresh, but clears consent and invalidates prior checks. No active audit or browser automation begins until all activation gates pass.
5. Start the audit and transition into the three-zone live workspace: a narrow project sidebar, a primary central Agent Activity Feed, and a right panel with real natively rendered embedded Chromium above dynamic TODOs. Playwright controls that exact displayed session and the Agent owns control by default. The feed streams actual progress, tool events, observations, verification, and findings; explicit exclusive handoff can grant the User browser control without concurrent agent browser operations. A persistent header identifies the project, authorized target, and audit state.
6. If clarification, a decision, or required information is needed, the agent calls `ask_user` and pauses safely before presenting a prominent Activity Feed question card. Show Awaiting Input and keep TODOs/browser preview accessible, labeling recovery unavailability. UI and trusted runtime validate responses; invalid input stays pending with inline errors and retained entered data under privacy rules. A valid answer or explicitly supported Skip resolves the question and allows safe continuation under existing execution gates. Recovery-related answers continue recovery first; Skip evaluates safe alternatives or ends as Blocked when required information prevents the goal and no safe continuation remains. Dismissal leaves the question pending.
7. The agent collects actual evidence, independently reproduces potential defects, checks false-positive explanations, and classifies results according to the verification contract.
8. Open a saved Completed, Blocked, or Interrupted audit into a polished, read-only Audit Overview before inspecting individual findings. Review the recorded audit identity, separate finding-classification counts, evidence-grounded summary, actual execution progress, and important findings, with read-only access to saved activity and evidence in the same workspace. Completed audits disclose coverage limitations; Blocked and Interrupted audits are partial with distinct blocking-versus-technical reasons. Opening a saved audit never restarts or resumes it.

Returning users with a configured provider and model skip Connect AI by default and may change provider or model through Settings for subsequent audits. The user defines the goal during setup and the agent runs autonomously by default. Execution-affecting user interaction is limited to structured `ask_user` responses and the explicit browser-control handoff/direct interaction defined below. There is no persistent composer, general-purpose messaging, generic Pause/Resume/Stop, or audit-goal redirection control. Ordinary panel resizing, view navigation, preview enlargement, and finding inspection do not change browser ownership or interrupt the agent; User-owned direct browser input is a deliberate serialized handoff exception. Internal runtime cancellation remains separate.

While an audit is active, users may browse other projects' saved sessions, findings, evidence, and reports read-only. The active audit continues independently in the background within the same desktop application, with a persistent global project/state indicator and an instant return action. New Audit stays visible but explains the one-active-audit limit and offers return to the active audit; it must not start a second audit, replace the running audit, or create an empty session. New audit creation/start becomes available after the active audit reaches a terminal state.

During a temporary provider interruption, the audit follows **Provider Connectivity and Automatic Recovery**: show Reconnecting, recover automatically within the retry and execution budgets, inspect current browser state, and continue without replaying browser actions. Exhausted recovery ends the audit as Interrupted with locally saved, clearly incomplete partial results.

If the page, tab, browser, or context fails, follow **Browser Failure Detection and Automatic Recovery**: show Browser Recovering, suspend further execution, and attempt recovery up to twice. Re-establish the actual preview and inspect actual browser state before safe continuation. Failed recovery after two attempts ends the audit as Interrupted with trustworthy partial results saved locally.

## Screens and Layout

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`.

- **Startup and first-launch empty state:** A polished startup leads to an off-white workspace with a New Audit entry point.
- **Left project sidebar:** A narrow, collapsible sidebar contains recent projects, distinctive letter-based project icons, New Audit, and Settings. During an active audit, users may open other projects' saved audit content read-only without affecting the running audit.
- **New Audit overlay and active-audit guard:** When no audit is active, show a minimal, elegant, professionally animated overlay with contextual Connect AI, Configure Audit, and Review & Start steps. It should not feel like a long setup wizard. When an audit is active, keep New Audit visible but explain the one-active-audit limit and offer a clear return-to-active-audit action; do not create an empty session or cancel/replace the running audit.
- **Center Agent Activity Feed:** The primary content area occupies approximately 60% of the available content width after the sidebar. It shows autonomous progress updates, actual Playwright tool events, observations, verification progress, contextual finding cards, and prominent `ask_user` questions. Tool details and linked evidence are expandable; technical metadata is collapsed by default. No persistent composer or general-purpose messaging is present.
- **Right embedded-browser and TODO panel:** A resizable panel occupies approximately 40% of the available content width after the sidebar. Its upper section embeds real Chromium with native continuous rendering, showing the exact session controlled by Playwright, with an option to enlarge the view. The Agent owns browser control by default; direct User input requires explicit safe exclusive handoff. Dynamic TODOs remain below it with the five established states. Both are visible when dimensions allow; no screenshot-streaming substitute or duplicate hidden browser is permitted.
- **Persistent workspace header:** Show the project name, authorized localhost target, and current audit state, including Running, Awaiting Input, Reconnecting, Browser Recovering, Completed, Blocked, and Interrupted. Generic Pause/Resume/Stop and audit-goal redirection controls remain excluded; the separate explicit browser-ownership handoff follows its own defined lifecycle.
- **Browser ownership status:** Clearly show Agent in Control, Handoff Pending, You are in Control, or Awaiting Control Decision separately from audit status. After a pending-handoff crash and successful recovery, show explicit Take Control and Return Control to Agent choices.
- **Global active-audit indicator:** Independently of the browsed project or view, persistently identify which project owns the active audit and show its current state. Provide an instant return to that audit's current feed, preview, and TODOs. Clearly distinguish the browsed project/session from the globally active audit.
- **Findings view:** Contextual finding cards appear in the feed, and a dedicated Findings tab or panel within the same workspace provides access to all findings and their required details. Users can inspect findings without interrupting the audit.
- **Resizing and narrow-window layout:** Major workspace panels are resizable, and the sidebar is collapsible. When space is limited, prioritize the Activity Feed and provide accessible Browser Preview, TODOs, and Findings tabs. Resizing or navigating observation views does not interrupt agent execution.
- **Provider recovery presentation:** A persistent Reconnecting status and concise activity-feed progress updates communicate automatic recovery. Keep the browser preview, TODOs, and collected findings visible. Exhausted recovery is presented as Interrupted with incomplete results available for inspection.
- **Browser recovery presentation:** A persistent Browser Recovering status and concise progress updates keep the activity feed, TODOs, and existing findings accessible. Clearly mark the preview temporarily unavailable until it can be re-established from the newly created actual browser session. Failed recovery after two attempts is Interrupted with unfinished checks clearly labeled.
- **Structured question interaction:** A prominent, polished, non-blocking `ask_user` question card appears inside the central Agent Activity Feed rather than a full-screen modal. The workspace header clearly indicates Awaiting Input. The browser preview area and TODOs remain visible, with an explicit unavailable indication when the browser session is being recovered. If the card is dismissed or minimized, a persistent Answer Pending Question action reopens it without changing the waiting state.
- **Background question notification:** If the active agent asks a question while another project is being viewed, show a prominent global notification. Allow return to the pending question while preserving the user's previous navigation context; the question remains Awaiting Input until a valid answer or explicitly supported Skip resolves it.
- **Settings:** Users can change provider/model configuration for subsequent audits; Settings cannot redirect an active audit. Translate the established provider/model behavior and premium visual direction into the technical spec without adding unapproved Settings features.
- **Saved sessions and Audit Overview:** Each project has a clean, compact, chronological list of saved Completed, Blocked, and Interrupted sessions, with the entry fields and stable ordering defined under **Local Projects, Sessions, and Reports**. Clicking an entry opens its polished read-only Audit Overview with recorded identity, separate finding classifications, available severity/progress metrics, grounded summary, finding previews, and saved activity/evidence access. Partial reports distinguish blocking from technical interruption reasons; Completed reports disclose coverage limitations. Opening historical content never restarts/resumes execution or disrupts an active audit. A project without saved sessions shows an elegant empty state.

## Look and Feel

Source: `scope.md > Inspiration & Identity` and `scope.md > Mandatory PRD Requirements`.

- Premium desktop presentation: minimal, elegant, polished, and professional.
- Off-white workspace, polished startup, first-launch New Audit empty state, and an animated New Audit overlay.
- Project sidebar with distinctive letter-based icons.
- Premium three-zone layout with a primary central feed, resizable supporting panels, clear typography, generous spacing, subtle animations, and a refined off-white palette.
- Keep technical metadata collapsed by default and communicate unavailable, recovering, awaiting-input, completed, blocked, and interrupted states clearly without fabricating activity.
- Structured question cards integrate naturally into the premium off-white workspace, with subtle animations and clear interaction states. They remain visually prominent without blocking access to the rest of the workspace.
- Audit Overviews use the same premium off-white language and consistent typography, clear hierarchy, subtle status indicators, and spacious cards rather than a dense analytics dashboard. Findings and actual evidence are easy to navigate, with historical sessions strictly read-only.
- Execution-interface inspiration from Codex, Claude Code, and OpenCode: autonomous, observable activity, real tools, and structured questions.
- This inspiration does not imply a general-purpose chat experience.
- The layout and visual direction above are established. Exact font/color tokens and animation mechanics are for the technical spec to translate from that direction. The HTML scope companion's visual design is not an approved application design.

## Features and Behavior

### New Audit Setup and Preflight

Source: `scope.md > The Core Loop` and `scope.md > Mandatory PRD Requirements`; elaborated by the learner's first-use requirements during this interview.

When no audit is active, the setup overlay has three contextual steps. If an audit is active, apply **Project Navigation During an Active Audit** instead: keep New Audit visible, explain the limit, and offer return to the active audit without starting a second audit or creating an empty session.

1. **Connect AI:** Open the live Models.dev Providers page, select a provider, browse only its models and choose an original provider/model ID supported by an installed Vercel AI SDK adapter. Configure its protected key, establish actual model connectivity, then verify Agent-required tool calling as a distinct step. Catalog presence and basic connection alone are not audit readiness. No FlowProof AI account is required.
2. **Configure Audit:** Collect the required project name, a valid port for the fixed `http://localhost` host, the required user-defined goal, and explicit per-audit target authorization. The URL path is optional and defaults to `/`; project description is optional but recommended. Configured execution-budget settings must be valid under the approved execution limits.
3. **Review & Start:** Display the exact resolved localhost target, project name, and audit goal. Automatically run provider/model connectivity, target availability, explicit authorization, and execution-budget validation checks on entry. Present individual results before enabling Start Audit, then revalidate critical conditions immediately before creating an active audit or beginning browser automation.

**Configure Audit fields**

| Field | Requirement |
| --- | --- |
| Project name | Required: a non-empty, human-readable name. |
| Local target | Required: the host is fixed to `http://localhost` in the first-release UI; the user configures a valid integer port from **1–65535**. |
| Audit goal | Required: a non-empty, user-defined description of what the agent should test. |
| Explicit target authorization | Required: an unchecked-by-default confirmation that the user owns the application or has permission to test it and authorizes FlowProof AI to interact with it within the defined audit scope. |
| URL path | Optional; defaults to `/` and supplies the initial path. It must not override the fixed host or configured port. |
| Project description | Optional but recommended to provide additional application context. |
| Execution-budget settings | Configurable limits under the approved scope: agent-step and timeout limits, plus token/cost limits where provider information is available. Required settings must be valid before activation; unavailable usage information remains explicit. |

**Validation and activation gates**

- Validate every required field before the user can proceed from Configure Audit. Blank project names/goals, invalid ports, or missing explicit authorization do not pass validation.
- Every new audit requires its own explicit target confirmation, including audits of a previously saved project. Do not pre-check it or infer permission from project history.
- Display the exact resolved URL, using the fixed host, selected port, and initial path, together with the project name and exact user-defined goal on Review & Start.
- Provider/model connectivity, localhost availability, explicit authorization, and execution-budget settings must pass preflight before execution. The selected target must be authorized for the defined audit scope.
- Do not create an active audit or begin browser automation before validation, authorization, and preflight all succeed and the user starts the audit. The existing one-active-audit guard still applies.
- Failed validation or preflight cannot activate an audit; preserve entered form data under the existing setup behavior.

Returning users with a configured provider/model skip Connect AI by default. Provider/model changes are available through Settings.

**Provider-first discovery and staged connection verification**

- Entering AI connections opens a dedicated Providers page and requests the current public Models.dev catalog. Display actual catalog providers, with provider search and reviewed logos when available; use an honest initial fallback when no valid logo exists. Never inject the six registered adapters as fabricated discovery results. Show cached data and its timestamp while refresh runs, with explicit loading, retry, refresh and offline/error feedback that does not block navigation unnecessarily.
- Select a provider to navigate to only that provider's catalog models. Show names and original IDs, search and advisory filters for tools, structured output, reasoning and modalities, plus context/output limits and available informational prices. Back navigation preserves the provider and search context; similarly named models from other providers never mix into this list.
- Model selection preserves the exact original `(providerId, modelId)` pair. Do not infer IDs from names or send full catalog objects over privileged IPC. Main validates a new selection against its normalized catalog and the trusted registered adapter/model-ID rules. Keep the six installed adapters: OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek and Groq. Catalog presence, adapter availability, connection success and tool verification are distinct states; unsupported providers remain browsable with execution disabled.
- Connect AI saves/reuses/replaces/removes required keys through Main-owned OS-backed storage; newly entered input crosses the trusted bridge, but stored values never return to Renderer. A separate bounded actual model invocation establishes authentication/basic connectivity. Saving a key or loading metadata is never a successful connection. Failures preserve the selected configuration and protected key unless the user removes/replaces them.
- After a successful connection, run an explicit bounded real tool-calling check. Require valid tool arguments, a harmless local result and demonstrated result consumption. Plain text, advertised tools, unsupported tools, invalid results and inconclusive responses never grant Agent readiness. Show authentication/basic connection separately from tool compatibility and retain safe stage/category diagnostics for auth/model-access, network, rate limit, timeout, response validation and tool errors. Always finish Connecting/Verifying states; never display raw SDK exceptions, headers, responses or credentials.
- Audit readiness requires fresh matching connection and tool results for the current model/adapter/key revision. Within uninterrupted setup reuse fresh checks rather than duplicate paid calls; dismissal/restart/configuration changes revoke activation authority and require fresh consent/checks. Models.dev refresh failure alone does not revoke an otherwise valid supported configuration. Cache validated snapshots, retain original IDs, label stale/unavailable data and never fabricate an offline first-launch catalog. Prices remain advisory, not real-time billing.
- New Audit integrates Providers → provider models → model/key → connection → tools → Configure → Review. Returning from the picker preserves the draft, selected provider/model and the existing per-audit authorization rules. Slice 2 prepares a typed configuration only; no fake audit/activity is created and autonomous execution remains Slice 3. Catalog npm/API fields grant no packages, endpoints, code execution or permissions; the approved npm/process/browser architecture is unchanged.

**Automatic preflight and transparent feedback**

- Automatically run all required preflight checks whenever the user enters Review & Start. Show each check individually as **Checking**, **Passed**, or **Failed** rather than presenting an unexplained aggregate result.
- Check provider/model connectivity, localhost target availability, explicit authorization for the current audit, and valid execution-budget settings. The review summary shows the exact resolved localhost target, project name, and audit goal before execution.
- Keep **Start Audit** disabled until every required check passes. A previously saved provider configuration or an earlier successful check is not sufficient to authorize a new activation.
- If a check fails, show a clear, actionable error and provide **Retry Checks** without losing entered form data or exposing secrets in the error. Failed preflight leaves the audit unstarted.
- When relevant provider/model, target, authorization, budget, or other checked configuration changes, invalidate and automatically rerun affected checks. Results must correspond to the current configuration, not a stale version.
- Immediately before starting, revalidate critical conditions: provider/model connectivity, target availability, current explicit authorization, valid budgets, and the one-active-audit guard. If revalidation fails, keep execution unstarted and show the failed check; an earlier Passed state cannot bypass an activation gate.
- Preflight is setup validation, not audit execution. It must not create an active audit session, begin browser automation, or be represented as completed audit checks, browser actions, or findings. Only the user's Start Audit action followed by successful current activation gates transitions into the live workspace.

**Dismissal, secure draft restoration, and Start Fresh**

- Closing or dismissing New Audit never starts an audit. Opening or dismissing setup must not create empty projects or audit sessions; an unfinished setup draft is distinct from saved project/session records.
- Preserve non-sensitive draft fields, including project name, localhost port/path, project description, and audit goal, and the relevant setup progress needed to continue. Preserve entered data across step navigation and validation failures as well.
- Reopening New Audit offers a seamless way to continue the existing draft from the last relevant step, subject to required authorization and validation gates. Restoring a step does not restore permission to execute.
- Do not preserve authorization consent across dismissal. Clear it and require the user to explicitly confirm authorization again before activation; never pre-check it from a draft or project history.
- Do not persist raw API keys, temporary test credentials, or other secrets in ordinary draft storage. A securely saved provider configuration may be reused through the existing OS-backed credential storage without exposing its secret value.
- Do not automatically trust previously successful preflight checks after reopening. Invalidate their activation authority and rerun the required checks before activation, including the immediate pre-start critical-condition revalidation.
- Provide a clear **Start Fresh** option to discard the unfinished draft and begin a new configuration. New consent and preflight gates still apply; clearing a setup draft does not itself launch an audit or create empty records. Provider credentials retain their separately approved secure-storage lifecycle.

**Setup presentation**

Keep the overlay elegant, responsive, and consistent with the premium off-white visual direction. Use subtle progress animations and clear validation feedback. Avoid unnecessary full-screen loading or blocking unrelated navigation while checks run; preserve form data when validation fails.

**Observable acceptance criteria**

- Entering Review & Start automatically displays the exact target, project name, and goal and runs individual provider/model, localhost, authorization, and budget checks with Checking/Passed/Failed states. Start Audit is disabled until all required checks pass.
- A failed check gives actionable feedback and Retry Checks with form data retained. Relevant configuration changes invalidate and rerun affected checks; immediately pre-start critical revalidation prevents stale Passed results from authorizing execution.
- Closing setup creates no empty project/session and starts no audit. Reopening restores non-sensitive draft data and relevant progress while requiring fresh explicit consent and rerun checks; it never restores secrets from ordinary draft storage or trusts prior preflight success.
- Start Fresh discards the unfinished draft and begins a new configuration without execution or empty saved records. A securely saved provider configuration can be reused without exposing its secret value.
- Setup remains responsive, with subtle progress feedback and unrelated navigation available. Preflight remains distinguishable from actual execution, and no active session or browser automation begins before every activation gate passes.

### Target Authorization and Browser Boundaries

Source: `scope.md > Execution and Product Breadth` and `scope.md > Mandatory PRD Requirements`; elaborated by the learner's explicit Configure Audit authorization requirements.

- Keep the target host fixed to `http://localhost` in the first-release UI, with a configurable valid port and initial path. Path entry must not bypass the fixed host or configured port.
- Obtain explicit ownership/permission and scope confirmation for every new audit; a saved project is not an authorization grant for a subsequent audit.
- Enforce the authorized localhost target and defined audit scope at the **browser-runtime level** for both Agent and User ownership, including redirects, popups, and navigation attempts. UI validation alone is not sufficient. Popup handling must respect the existing single shared-tab boundary, and embedded page content must remain isolated from privileged Electron functionality.
- Prevent unapproved high-impact operations. If an explicit decision is required, use the existing structured `ask_user` mechanism and safe Awaiting Input behavior before performing the operation.
- The target confirmation authorizes interaction within the defined audit scope, not unapproved activity outside it. Structured answers do not remove the first-release localhost or other execution boundaries.
- Apply the established **Risk-based Action Permissions** policy below. Understood low-risk forms within the goal may proceed autonomously; approval-required operations need a specific `ask_user` decision, and hard restrictions take precedence over both initial target authorization and individual approval.
- A browser-control handoff does not expand authorization or override the existing action/security policy. Mandatory 4-spec validation must cover enforcement of those boundaries during direct User interaction as well as Agent control.

### Risk-based Action Permissions

Source: `scope.md > Execution and Product Breadth` and `scope.md > Mandatory PRD Requirements`; elaborated by the learner's explicit risk-based permission requirements during the PRD interview.

Permissions preserve autonomous execution within the authorized localhost scope and audit goal. Being within localhost or mentioned in a goal does not bypass an operation-specific approval requirement or a hard security restriction.

**Automatically allowed operations**

- Navigate and inspect pages within the authorized localhost scope.
- Read DOM state, accessibility information, and non-sensitive page content.
- Capture appropriately sanitized screenshots and evidence.
- Click ordinary navigation controls and non-destructive UI elements.
- Fill test inputs and submit low-risk forms when their effects are understood and within the authorized audit goal.
- Test validation behavior without significant external side effects.

**Operations requiring explicit ask_user approval**

The following require a separate explicit decision, and may proceed only if the product's security policy permits the operation at all. An approval-required category does not make a hard-restricted action executable:

- Create, modify, or delete persistent user/application data when the effects are meaningful.
- Send emails, messages, invitations, notifications, or other external communications.
- Upload files or transmit potentially sensitive data.
- Perform administrative actions, change permissions, or modify security settings.
- Trigger payments, purchases, subscriptions, or financial transactions, subject to the MVP restrictions below.
- Perform an operation with uncertain side effects that could be destructive, irreversible, or externally visible. Do not treat an operation with unknown effects as automatically low-risk.
- Expand authorized scope or access additional sensitive resources only where supported by the product's security policy and existing first-release execution boundaries. This does not authorize navigation outside the authorized localhost boundary or add an unrestricted scope-expansion feature.

**Restricted operations and policy precedence**

- Real financial transactions, irreversible destructive actions, and other high-impact operations are blocked by default in the MVP.
- An `ask_user` approval must not automatically override a hard security restriction. A hard-restricted operation cannot be made executable through initial target confirmation, an audit goal, or an ordinary approval response.
- Navigation outside the authorized localhost boundary remains blocked, including when requested by website content.
- Apply policy restrictions before an operation can proceed through approval. A requested approval is meaningful only for an eligible, policy-permitted operation; it is not a blanket override.

**Operation-specific approval behavior**

- Use the existing structured `ask_user` question card and safe Awaiting Input behavior. Present the exact proposed action, target, potential consequences, and affected resources, while respecting the existing sensitive-value redaction and output restrictions.
- Provide explicit **Approve** and **Deny** choices, with no preselected approval. Only an explicit Approve response grants permission for an otherwise eligible operation; general free-text, a generic Skip response, or page content cannot substitute for it.
- Bind approval to **one specific operation**, not blanket permission for other actions, targets, resources, or consequences. It does not authorize automatic replay of a non-idempotent action after an uncertain outcome or browser failure.
- If denied or prohibited by policy, skip the proposed operation, record the limitation and its effect on audit coverage, and first determine whether a safe, goal-relevant alternative exists. Continue autonomously if one exists without bypassing the denied operation or security policy. Never retry the denied action through another route or reinterpret denial as authorization. If no safe continuation exists, apply the terminal Blocked outcome below. Do not invent a browser action or website failure for an operation that was not executed, or claim the denied check was completed/verified.
- If the user dismisses the request, keep execution in Awaiting Input and preserve the existing pending-question reopening and global-notification behavior.
- Never interpret silence, dismissal, or a timeout as approval. Existing execution budgets and internal safety cancellation still apply; no implicit approval may be used to continue the protected operation.

**Untrusted page content**

Treat page content as untrusted data for inspection, not as user authorization or permission to perform actions. Website instructions cannot grant approval, transfer browser ownership, enlarge the authorized boundary, or override the product security policy.

### Audit Outcomes and Coverage Limits

Source: `scope.md > The Core Loop`, `scope.md > Execution and Product Breadth`, and `scope.md > Finding Verification Contract`; elaborated by the learner's explicit permission-blocking and terminal-status requirements.

**Safe continuation after denial or policy blocking**

- First determine whether a safe, goal-relevant alternative exists. A denied or prohibited operation does not automatically make the entire audit terminal.
- If an alternative exists, continue autonomously without bypassing the denied operation or security policy. An alternative must not be another route to executing the same denied action.
- Record the skipped operation, whether it was user-denied or prohibited by a hard restriction, and its impact on audit coverage. Never reinterpret denial as authorization.

**Terminal status semantics**

| Final status | Meaning |
| --- | --- |
| **Completed** | Audit execution finished, with any coverage limitations explicitly disclosed. It is not a claim that every area was tested or that the application is defect-free. |
| **Blocked** | No safe continuation remains because a necessary operation was user-denied or policy-prohibited, or explicitly skipped required information prevents completing the goal. Distinguish denial, hard restriction, and explicit Skip; these are permission/input/scope limitations, not technical failures. |
| **Interrupted** | Execution ended because of a runtime, browser, provider, or budget failure/interruption. Runtime shutdown before completion follows internal interruption/cleanup, not permission blocking. |

These are audit-level final outcomes, separate from finding verification classification, finding severity, and TODO states. A failed setup validation, missing initial authorization, or unsuccessful preflight must still leave the audit unstarted under the existing activation gates.

**Blocked completion and partial report**

- If no safe continuation remains, end the audit with terminal **Blocked** status and clearly explain whether a necessary operation was denied/prohibited or explicitly skipped required information prevents completing the goal.
- Distinguish **user denial**, a **hard security restriction**, and **explicitly skipped required information** in the blocking reason. Skip is neither denial nor authorization; none of these reasons is a browser/provider/runtime failure.
- Preserve completed execution events, valid evidence, and previously verified findings. Incomplete TODOs and verification attempts remain explicitly not completed; do not manufacture completion or promote unsupported findings.
- Save a partial, read-only audit report with the blocking reason and relevant coverage limitations, respecting existing sensitive-output restrictions.
- Never report the blocked operation as executed or classify the restriction itself as a website defect. Independently supported findings collected earlier retain their valid verification status.
- Show Blocked in the workspace, audit history, and saved Audit Overview. Apply the existing terminal resource/secret cleanup and one-active-audit lifecycle; a terminal Blocked audit no longer prevents creating a subsequent audit.
- This adds no generic Pause/Resume/Stop, audit-goal redirection, or general chat controls. Execution-affecting interaction remains within structured `ask_user` and the separately defined exclusive browser-ownership handoff; neither bypasses permission policy.

### Workspace Layout and Observation UI

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`; elaborated by the learner's explicit three-zone workspace requirements during the PRD interview.

- **Left:** A narrow, collapsible project sidebar with recent projects, distinctive letter-based icons, New Audit, and Settings.
- **Center:** The primary Agent Activity Feed, initially approximately **60%** of the available content width after the sidebar. It displays autonomous progress, actual Playwright tool events, observations, verification progress, contextual finding cards, and prominent agent-initiated `ask_user` questions.
- **Right:** A resizable panel, initially approximately **40%** of the available content width after the sidebar. Put the actual native embedded Chromium session above dynamic TODOs, with an option to enlarge the browser view. Direct browser interaction follows the explicit ownership/handoff rules; both views remain visible when dimensions allow.
- **Header:** Persistently show the project name, authorized localhost target, and current audit state: Running, Awaiting Input, Reconnecting, Browser Recovering, Completed, Blocked, or Interrupted as applicable. State presentation must reflect actual execution.
- Major workspace panels are resizable. The approximate 60/40 split is the intended starting composition, not a restriction preventing user resizing.
- Tool events expand to show technical details and linked evidence. Technical metadata is collapsed by default to keep the workspace uncluttered, and the existing sensitive-input/output restrictions still apply.
- When window space is limited, prioritize the Activity Feed and provide accessible **Browser Preview**, **TODOs**, and **Findings** tabs. Requirements to keep supporting views visible mean simultaneous visibility when dimensions allow, with access through these tabs in the narrow-window layout.
- Observation-only UI actions—including panel resizing, navigation between views, browser-view enlargement, and finding inspection—must not pause, stop, restart, redirect, or otherwise interrupt the agent or implicitly change browser ownership. Execution-affecting interactions are structured `ask_user` responses and explicit exclusive browser-control handoff/input, not free-form agent messaging or generic execution controls.
- Activity, actual browser state, TODOs, and findings stay synchronized to the current audit session independently of panel layout or the visible observation view.
- Clearly show unavailable, recovering, awaiting-input, completed, blocked, and interrupted conditions. Do not invent browser frames, tool events, or progress to make a state look active.

### Project Navigation During an Active Audit

Source: `scope.md > The Core Loop` and `scope.md > Execution and Product Breadth`; elaborated by the learner's explicit non-disruptive navigation requirements during the PRD interview.

**Read-only project browsing and return**

- Users may open other projects and inspect their previously saved audit sessions, findings, evidence, and reports read-only while an audit is active.
- The active agent runtime and browser session continue independently of the displayed project or view, in the background within the same desktop application.
- Navigation must not pause, cancel, restart, redirect, or otherwise modify the running agent. It must not create additional browser contexts or duplicate agent execution.
- Maintain a persistent global indicator identifying the project with the active audit and its current state, regardless of the displayed project/view.
- Let the user return instantly to the active audit and see its current activity feed, actual Live Browser Preview, and TODOs without restarting or replaying execution.
- Keep saved project/session content associated with the session being inspected. Do not mix historical findings/evidence with the active audit's live data or mislabel one as the other. Live-panel visibility requirements apply to the active audit workspace; visiting saved content does not require replacing that content with the active audit view.

**New Audit while another audit is active**

- Keep New Audit visible, but explain that only one audit can run at a time and offer a clear action to return to the active audit.
- Do not start a second audit, cancel or replace the running audit, or create an empty audit session.
- The one-active-audit guard applies throughout non-terminal states, including Running, Awaiting Input, Reconnecting, and Browser Recovering, and while Awaiting Control Decision; a waiting or recovering audit is still active.
- Once the active audit reaches a terminal state, allow creating and starting a new audit under the existing execution and cleanup boundaries. Navigation or a previously blocked New Audit action must not automatically launch one.

**Questions while viewing another project**

- If the active agent invokes `ask_user` while the user is viewing another project, show a prominent global notification and reflect Awaiting Input in the active-audit indicator.
- Let the user return to the pending question without losing the project/session/view context they were browsing, so that context remains available afterward. Do not force a context-destroying navigation change.
- The agent remains in Awaiting Input until a valid answer or explicitly supported Skip resolves the question. Changing the displayed project does not answer, skip, cancel, or bypass the question; existing internal cancellation/safety requirements still apply. A required question without Skip support cannot be bypassed.
- Apply the existing question-card behavior and sensitive-input restrictions to notifications and question return. Notification or navigation must not expose sensitive answers, introduce generic execution controls, or implicitly transfer browser ownership.

### Autonomous Agent Activity Feed

Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, and `scope.md > Execution and Product Breadth`.

- The user supplies the audit goal during setup and starts execution. The agent autonomously plans and performs the audit.
- The central primary area displays streamed agent progress messages, actual Playwright tool events, observations, verification progress, and contextual finding cards.
- The activity feed reflects actual execution; it must not present fabricated reasoning or simulated actions as activity.
- Tool events are expandable to inspect technical details and linked evidence, with technical metadata collapsed by default. Prominent `ask_user` cards appear within the feed, and findings are also available through the dedicated workspace Findings view.
- There is no persistent chat composer, general-purpose user messaging, unsolicited mid-audit instruction change, or user-initiated additional-test conversation during execution.
- Users have no generic Pause/Resume/Stop or audit-goal redirection controls. They may answer `ask_user` or explicitly take browser control through safe exclusive handoff; during User ownership, agent browser operations are suspended. Observation-only navigation, resizing, enlargement, and inspection do not themselves affect execution or ownership.
- Progress messages, structured questions and responses, TODO updates, browser events, evidence, and findings stay associated with and synchronized to the current audit session.
- Distinguish User/manual browser actions from Agent/Playwright executions in the activity/history. Manual interaction must not appear as a fabricated agent tool call or automatically verified agent execution.

### Dynamic TODOs

Source: `scope.md > Execution and Product Breadth`.

The agent automatically creates and continuously updates TODOs as it plans and performs the audit. Show them below the actual browser preview in the right panel, using **pending**, **in progress**, **completed**, **blocked**, and explicitly permitted **skipped** states grounded in actual execution. Failed, unknown and interrupted action outcomes remain distinct from TODO completion; a terminal audit leaves unfinished tasks visibly incomplete. TODOs and the preview remain visible alongside the feed during normal execution when dimensions allow, including while Awaiting Input; narrow windows provide accessible tabs as defined under **Workspace Layout and Observation UI**. A crash or uncertain action outcome must not be falsely represented as a confirmed failure or success.

### Structured Clarifications Through ask_user

Source: `scope.md > The Core Loop` and `scope.md > Mandatory PRD Requirements`.

**Presentation and safe waiting**

- The agent may call `ask_user` when it needs clarification, a decision, or required information, including operation-specific approval under **Risk-based Action Permissions**.
- The agent must pause execution safely before presenting the question.
- Show a polished, visually prominent, non-blocking question card inside the central Agent Activity Feed rather than a full-screen modal. Clearly indicate **Awaiting Input** in the workspace header.
- Keep the Live Browser Preview area and dynamic TODOs visible while waiting; show actual browser state when available and explicitly indicate temporary preview unavailability during browser recovery.
- Support **single-choice**, **multiple-choice**, and **free-text** responses through the question-specific interaction. Free-text answers do not create a persistent general-purpose composer.

**Schema-driven response validation**

- Validate every structured response against the question's declared schema in both the UI and the trusted Agent runtime. UI validation alone cannot authorize continuation.
- **Single-choice:** Accept exactly one valid option from the declared options.
- **Multiple-choice:** Accept only valid options and enforce the configured minimum and maximum selection counts.
- **Free-text:** Required responses must not be empty or whitespace-only. Enforce reasonable input-length limits and any explicitly declared format constraints.
- Display clear inline validation errors without losing entered data. Sensitive values may remain only in the current ephemeral question interaction under **Sensitive Input Lifecycle**; error messages, logs, history, and reports must not expose or persist them.
- Invalid or incomplete responses never resolve the question or resume Agent execution. Keep Awaiting Input until the trusted runtime accepts a valid answer or an explicitly supported Skip; do not convert invalid input into Skip or infer a response.

**Answering and pending questions**

- A valid answer accepted by the trusted runtime resolves the question and automatically allows safe continuation of pending work. An explicitly supported Skip resolves it through the separate Skip behavior below. Existing budget, recovery, ownership, permission, and Terminating gates still apply. A recovery-related answer continues recovery first; normal audit execution waits for a safe inspected browser state.
- An ordinary question response does not implicitly reclaim browser ownership from the User. Agent browser work remains gated by explicit return of ownership and the required fresh state inspection.
- For an operation-approval question, only an explicit Approve can authorize its one eligible proposed operation. Deny skips that operation, records the limitation, and continues safe remaining work where possible; answering does not unconditionally execute the proposal or override hard restrictions.
- The user may dismiss or minimize the card without answering. This must not cancel the question, invent an answer, or resume execution.
- While the question remains unresolved, keep a persistent **Answer Pending Question** action visible so the user can reopen it.
- A required question without Skip support remains pending until a valid answer is accepted and cannot be bypassed. There is no manual Resume control.
- Question-driven pausing and resumption are automatic. Generic Pause/Resume/Stop and audit-goal redirection controls remain excluded; the explicit browser-ownership mechanism is separate and does not imply approval of a pending operation. Internal runtime cancellation can end an interrupted audit without inventing an answer.
- Questions and answers remain synchronized with the current audit session and its activity.
- If the user is viewing another project when a question is asked, use the global notification and context-preserving return behavior defined under **Project Navigation During an Active Audit**. A required answer is not bypassed by navigation away from the active audit.

**Explicit Skip outcome and safe continuation**

- Show Skip only when the question explicitly declares support for it. Validate that support in the trusted runtime as well as the UI; dismissal, navigation, invalid input, and silence never produce Skip.
- Record Skip as a distinct structured outcome, not an empty answer or implicit denial. Never infer an answer, permission, or authorization from it; Skip cannot substitute for explicit Approve on an operation-approval question or override hard restrictions.
- After an accepted Skip, allow the Agent to evaluate safe, goal-relevant alternatives without inventing the missing answer or bypassing permissions, ownership, execution budgets, or termination.
- If a safe alternative exists, continue execution and record the skipped step and its impact on audit coverage. Do not represent the skipped step as executed or successfully verified.
- If skipping required information prevents completing the goal and no safe continuation remains, end as **Blocked** with a clear explanation identifying the explicit Skip and its coverage impact. Preserve trustworthy partial results under **Audit Outcomes and Coverage Limits**; do not relabel Skip as denial or a technical interruption.
- Skipped questions never produce fabricated findings, verification results, or browser actions. For Skip, retain only non-sensitive question metadata and the Skip outcome in local history, not an invented answer or the user's unsubmitted draft response. Sensitive values remain subject to the approved ephemeral lifecycle.

**History and sensitive information**

- Preserve questions and non-sensitive answers in the local audit history.
- Sensitive inputs must never be exposed in activity logs, screenshots of FlowProof AI's interface, or generated reports. History content must also respect this restriction.
- Sensitive answers follow the explicit classification, authorized-use, and ephemeral lifecycle defined under **Sensitive Input Lifecycle**. Only non-sensitive question/answer metadata may be retained for a sensitive response; never its secret value.

**Observable acceptance criteria**

- Zero, multiple, or undeclared selections for single-choice, out-of-range multiple-choice selection counts, whitespace-only required text, excessive input length, and violations of declared formats fail validation in both UI and trusted runtime. Inline errors preserve entered data without exposing sensitive values; invalid/incomplete responses never resume execution.
- A valid runtime-accepted answer or explicitly supported Skip resolves the question, with safe continuation subject to all existing execution gates. A required question without Skip support cannot be bypassed, and a runtime-submitted unsupported Skip is rejected.
- Dismissing or minimizing a card leaves the question pending, the audit in Awaiting Input, and Answer Pending Question available.
- Accepted Skip remains a distinct outcome with only non-sensitive metadata retained. A safe alternative records skipped work and coverage limitations; missing required information with no safe continuation produces a truthful partial Blocked report. Neither path invents answers, permission, actions, findings, or verification.

Schema validation and Skip outcomes are established. Operation-approval questions retain explicit Approve/Deny, no preselected approval, one-operation binding, and no permission from silence/dismissal/timeouts/Skip. Sensitive answers retain their approved ephemeral lifecycle; browser handoff remains a separate ownership interaction.

### Sensitive Input Lifecycle

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Preserved Architecture and Stack`; elaborated by the learner's explicit sensitive-input requirements during the PRD interview.

**Explicit classification**

- `ask_user` must declare whether each requested input is normal or sensitive using a structured field, such as `inputType: "text" | "secret"`.
- Passwords, authentication tokens, API keys, recovery codes, and similar credentials must always be treated as sensitive; a normal-text declaration must not make a credential non-sensitive.
- Users can mark a free-text response as sensitive.
- Apply defense-in-depth secret redaction to logs and evidence metadata, without relying on automatic detection alone in place of explicit classification.

**Masked entry and authorized use**

- Sensitive answers use masked input fields by default.
- Sensitive `ask_user` values are ephemeral: never persist them to SQLite, activity history, TODOs, logs, traces, analytics, or generated reports.
- Avoid passing raw secrets to the LLM when possible. Prefer a temporary opaque reference that an authorized browser tool can use for the explicitly authorized operation, rather than passing the raw value.
- A secret may be used only for its explicitly authorized operation.
- Once consumed, release the value and its references as soon as practical. Discard unused secrets when an audit is internally cancelled, fails, or ends, including application shutdown and execution-budget exhaustion.
- Retain only non-sensitive metadata for sensitive responses, such as question type and whether the question was answered, without retaining the secret value. Normal, non-sensitive answers retain the existing local-history behavior.

**Exposure and evidence boundaries**

- Never expose sensitive values in renderer logs, tool output, screenshots of FlowProof AI's interface, or exported evidence. Activity history, TODOs, logs, traces, analytics, and reports must not retain the values either.
- Minimize exposure in browser screenshots, Playwright traces, and diagnostic artifacts. Redact or omit sensitive artifacts where necessary.
- Redacting or omitting an unsafe artifact does not waive the finding verification requirements: communicate evidence limitations, and do not fabricate replacement evidence or claim verification without sufficient support.

**Provider-key separation and memory limits**

- Keep temporary test credentials and other ephemeral `ask_user` secrets separate from AI provider API keys, which continue to use secure OS-backed storage through provider configuration. The provider-key persistence rule does not authorize saving transient question answers.
- Use best-effort memory lifecycle management to limit retention and release references. Do not claim guaranteed memory erasure in JavaScript.

### Real Live Browser Preview

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`.

The Live Browser Preview is a **real, interactive, embedded Chromium browser** inside the desktop workspace, with native, continuously rendered page state. It is not a screenshot-streaming surface.

- Display the actual rendered page, including animations, scrolling, navigation, typing, and dynamic UI updates.
- Playwright must connect to and control the **exact same browser session** displayed to the user. A duplicate hidden browser, separate automation session, or substituted rendered state does not meet the requirement.
- The browser supports direct user interaction through the explicit exclusive handoff defined under **Browser Control Ownership and Handoff**; it is not permanently view-only.
- Keep it in the upper portion of the resizable right panel with an option to enlarge the viewing area. Enlargement itself does not transfer browser ownership. TODOs sit below it when space allows; narrow windows retain accessible Browser Preview and TODOs tabs.
- During browser recovery, clearly indicate temporary browser unavailability and re-establish both the native embedded view and Playwright connection against the same recovered session. Never fabricate a rendered state or show a missing session as live.
- Screenshots remain permitted sanitized evidence artifacts under the finding contract; they are not a substitute for the live native browser experience.
- Keep embedded page content isolated from privileged Electron functionality, with authorized localhost navigation enforced for both agent-owned and user-owned interactions.

This is the required product experience, not a claim that same-session embedding/control is already technically validated. **Mandatory 4-spec Validation** must establish compatibility, isolation, and crash-recovery feasibility before an implementation approach is approved.

### Browser Control Ownership and Handoff

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`; the learner explicitly replaces the earlier permanently view-only model with this exclusive ownership lifecycle.

**Agent in Control**

- The Agent owns the embedded browser by default. Display **Agent in Control** and a visible **Take Control** action.
- Users observe the actual continuously rendered page without browser input interfering with Agent operations. Focusing/enlarging the view or navigating the workspace does not transfer ownership.

**Handoff Pending**

- Selecting Take Control enters visible **Handoff Pending** and immediately prevents new Agent browser operations from being scheduled. Queued work must not begin while transfer is pending.
- Keep manual browser input disabled until exclusive transfer is safe. Allow an already in-flight Playwright operation to reach a bounded safe completion point before granting User control.
- Never blindly interrupt or replay non-idempotent actions. If an operation times out or its outcome is uncertain, record the uncertainty and use safe recovery; do not falsely mark it completed or grant competing control over an unresolved operation.

**You are in Control**

- Display **You are in Control** and enable direct clicking, typing, scrolling, and navigation within the authorized localhost boundary.
- Suspend all Agent browser operations and Agent execution that depends on browser state. Keep the activity feed, TODOs, and findings visible and accessible under the established responsive layout rules. Do not progress browser-dependent checks or verification based on stale state.
- Record relevant manual interactions as User-originated, separately from Agent/Playwright operations, respecting existing secret redaction and retention rules. Never fabricate Agent tool calls or count manual interactions as Agent-executed verification evidence.
- Keep browser handoff separate from structured `ask_user`: taking/returning control does not answer a pending question or approve an operation, and submitting an answer does not implicitly reclaim a User-owned browser.

**Return Control to Agent**

- Provide a visible **Return Control to Agent** action. Disable further manual browser interaction before reactivating Agent execution; never allow simultaneous control.
- Reinspect the actual current URL, rendered page state, DOM, and relevant session conditions, including authentication when relevant. Do not assume earlier page state, entered values, navigation, or session conditions survived manual interaction.
- Reconcile the existing plan and TODOs with the observed state. Resume autonomous execution only when safe and within budget, without blindly replaying previous actions or bypassing a required unanswered question or operation approval.

**Crash recovery and control restoration**

- **Crash during User Control:** Attempt bounded browser recovery under the existing two-attempt limit and execution budgets. Keep autonomous Agent execution suspended. After successful recovery, restore User Control; the user must explicitly select **Return Control to Agent** before Agent execution can continue.
- **Crash during Handoff Pending:** Cancel the incomplete handoff and attempt recovery under the existing bounded recovery policy. After successful recovery, enter **Awaiting Control Decision**. Require the user to explicitly select either **Take Control** or **Return Control to Agent**; autonomous Agent execution remains suspended until the user makes that decision and Agent ownership is established.
- **No silent ownership transfer:** Never silently transfer browser ownership to the Agent. Recovery, silence, dismissal, timeouts, and ordinary workspace interaction do not replace the required explicit **Return Control to Agent** selection after a User-Control or Handoff-Pending crash.
- These are browser-ownership interactions, separate from structured `ask_user` and audit-level status. Apply the established exclusive-control rules to either choice. Before Agent continuation, inspect the actual recovered URL/page/DOM/session state and reconcile the plan/TODOs; existing budget, unanswered-question, permission, and no-blind-replay gates still apply.

**Safe resumption after recovery**

- Validate the recovered browser session and enforce the authorized localhost boundaries before Agent execution can resume.
- Inspect the actual current page state before Agent execution can resume.
- Reconcile TODOs and execution history with the actual recovered page state before Agent execution can resume.
- Never blindly replay non-idempotent operations after recovery. An uncertain prior outcome is not permission to repeat the operation.
- After a crash during User Control or Handoff Pending, resume Agent execution only after the user explicitly selects **Return Control to Agent** and all required safety checks succeed. Authorization without successful checks, or successful checks without explicit authorization, is insufficient; existing budget, unanswered-question, and operation-permission gates remain in force.

**Shared safety and lifecycle**

- All ownership modes preserve one active audit, one isolated shared browser session/context, and one shared tab. Handoff creates no second browser session, hidden duplicate, or duplicate execution.
- Enforce the same authorized localhost boundaries, redirects/popup restrictions, privileged Electron isolation, and risk-based security policy for Agent and User control. Transfer does not expand scope or override policy.
- Sensitive manual inputs/history remain subject to existing privacy protections; omit or redact unsafe evidence rather than leaking credentials.
- Manual actions may explain how a state was reached but cannot replace actual Agent execution, sufficient evidence, traceable expectations, or independent reproduction required for a Verified Finding.
- Ownership is separate from audit state. Both owners remain subject to budgets, internal safety cancellation, recovery limits, and terminal cleanup; handoff does not release the active-audit slot or introduce generic Pause/Resume/Stop, free-form messaging, or audit-goal redirection.
- Ownership restoration after a browser crash follows **Crash recovery and control restoration** above. Same-session attachment, safe bounded transfer, input exclusion, policy enforcement, and recovery feasibility must be validated during 4-spec.

### Provider Connectivity and Automatic Recovery

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`; elaborated by the learner's explicit provider-recovery requirements during the PRD interview.

**Detection and retry policy**

- Detect transient connection failures, timeouts, and retryable AI-provider errors during an audit.
- Enter **Reconnecting** and temporarily suspend further agent planning. Recovery is automatic and does not require user intervention or manual retry controls.
- Preserve the active browser session, current TODOs, completed tool events, and collected evidence while reconnecting.
- A failed AI request alone does not trigger browser recreation. Actual browser failures follow the separate browser-recovery policy below.
- Retry the failed AI request up to **three times**, using bounded exponential backoff with jitter. Respect provider **Retry-After** headers when applicable and remain within the configured execution budget.
- Never automatically retry non-retryable errors, including invalid API keys or insufficient quota.
- Do not automatically switch AI providers or models.

**Execution integrity and continuation**

- Retry AI requests rather than repeating browser actions merely because an AI request failed.
- Record completed browser/tool actions exactly once; mark uncertain outcomes appropriately instead of presenting them as successful.
- After recovery, inspect the actual current browser state before continuing Agent browser execution, once the Agent owns control. Provider reconnection must not implicitly seize a User-owned browser.
- Continue automatically when connectivity is restored, the Agent has browser ownership, the required state inspection has occurred, and execution remains within budget. Restored connectivity does not override an exhausted budget or exclusive User ownership.

**Observable, safe recovery**

- Display a persistent Reconnecting status with concise progress updates in the activity feed.
- Keep the Live Browser Preview, TODOs, and collected findings visible throughout recovery.
- Error messages must not expose API keys, sensitive request payloads, or internal reasoning; apply the existing sensitive-input restrictions.
- A temporary provider failure is an execution/provider issue, not a website defect. Do not generate a target-application finding solely from the outage.

**Exhausted recovery and Interrupted results**

- When recovery attempts are exhausted, end the audit with **Interrupted** status.
- Preserve trustworthy partial results and evidence, and clearly mark unfinished verification as incomplete.
- Release browser resources and temporary sensitive data through internal cleanup, following **Sensitive Input Lifecycle**.
- Save the interrupted audit session locally for later inspection.
- Never fabricate successful tool executions, completed checks, or verification results to fill gaps left by the interruption.

### Browser Failure Detection and Automatic Recovery

Source: `scope.md > Mandatory PRD Requirements` and `scope.md > Execution and Product Breadth`; elaborated by the learner's explicit browser-recovery requirements during the PRD interview.

**Detection and bounded recovery**

- Detect page crashes, closed tabs, disconnected browsers, and unexpected browser-context failures.
- Enter **Browser Recovering** and suspend further agent execution.
- Preserve completed activity events, TODO states, verified findings, and persisted evidence that remains valid.
- Attempt automatic browser recovery up to **two times**, recreating the isolated page, browser context, or Chromium process as appropriate.
- Re-establish the native embedded view and Playwright connection against the same newly created actual browser session, not a duplicate hidden browser.
- Respect the existing execution budgets and single-active-audit, isolated-session/context, single-shared-tab Chromium boundaries. A successful recreation does not override an exhausted budget or the exclusive ownership requirement.

**Execution integrity and safe continuation**

- Never assume that a crash means the last browser action failed.
- Do not automatically repeat non-idempotent operations such as form submissions, purchases, deletions, or account changes.
- If completion cannot be established, mark the in-flight action **interrupted** or **outcome-unknown** rather than claiming failure or success without evidence.
- After recovery, validate the recovered session and authorized localhost boundaries, inspect the actual current page state, and reconcile TODOs and execution history before deciding how to proceed. Do not assume cookies, authentication state, or session storage survived. Apply **Browser Control Ownership and Handoff > Safe resumption after recovery**, including the explicit authorization required after a User-Control or Handoff-Pending crash.
- If safe continuation requires missing credentials or a user decision, use the existing structured `ask_user` interaction and **Sensitive Input Lifecycle**. The answer can automatically continue recovery; normal execution continues only after a safe state has been re-established and inspected.
- Automatically continue Agent browser execution only when the browser state is safe, Agent ownership is established, and the execution budget permits continuation. Recovery must not cause simultaneous User/Agent control. There are no generic manual execution-control buttons. For crashes during User Control or Handoff Pending, apply **Browser Control Ownership and Handoff > Crash recovery and control restoration**, including the required explicit user choice; recovery alone must not resume autonomous execution. Technical feasibility remains a 4-spec validation gate.

**Evidence and findings**

- Preserve valid evidence and fully verified findings collected before the crash.
- Never fabricate screenshots, browser events, or successful actions.
- A browser-infrastructure crash is not a website defect without independent supporting evidence.
- Verification attempts interrupted by the crash remain incomplete until successfully repeated under safe conditions. This does not authorize automatic replay of non-idempotent operations or promotion of unfinished verification.

**Recovery experience**

- Display a persistent Browser Recovering status with concise progress updates.
- Keep the activity feed, TODOs, and previously collected findings accessible.
- Clearly indicate when the actual browser preview is temporarily unavailable, and reconnect the preview to the recovered actual session.

**Terminal failure**

- If browser recovery fails after two attempts, end the audit as **Interrupted**.
- Save trustworthy partial results locally and clearly label unfinished checks and verification as incomplete.
- Clean up browser resources and temporary sensitive data through the established internal cleanup and ephemeral-secret lifecycle.
- Do not introduce user-facing Pause, Resume, or Stop controls or fabricate completion to hide the interruption.

### Autonomous Execution and Internal Cancellation

Source: `scope.md > Mandatory PRD Requirements`.

The agent autonomously plans, executes, and verifies by default. Users observe progress, respond to `ask_user`, and may explicitly request/take browser control through the safe exclusive handoff. While the User owns the browser, Agent browser operations are suspended; explicit return to the Agent requires fresh state inspection before continuation. Ordinary panel resizing, view navigation, enlargement, and finding inspection do not change ownership or interrupt execution. Generic user-facing Pause/Resume/Stop, general messaging, and audit-goal redirection remain excluded. Internal budgets, cancellation, cleanup, and the one-active-audit guard apply in both ownership modes.

The runtime must support **internal cancellation and cleanup** for:

- Application shutdown.
- Critical failures.
- Execution-budget exhaustion.
- Other safety conditions.

**Cancellation initiation and Terminating**

- Immediately enter a visible **Terminating** audit state when possible, reflected in the workspace header and global active-audit indicator while the application can still display them.
- Prevent new Agent steps, AI requests, browser operations, and verification attempts from starting, including queued work and recovery retries. Signal cancellation to pending requests where supported.
- Do not initiate additional browser actions merely to complete the audit or finish verification. Cancellation never bypasses the configured execution budget or implicitly returns browser ownership to the Agent.
- Terminating is a non-terminal lifecycle state, not a browser-ownership state or a user-facing execution control. Retain the one-active-audit guard through bounded termination and cleanup; do not launch another audit while termination is still in progress.

**In-flight browser operations and cleanup deadline**

- When feasible, allow an already-running browser operation to reach a bounded safe completion point. Do not interrupt or blindly retry potentially non-idempotent operations.
- Use a short, configurable cleanup deadline appropriate to the operation within the bounded shutdown process. The deadline does not extend the execution budget or authorize additional Agent work, AI requests, browser actions, or verification.
- If the operation completes within the deadline, record its actual observed outcome. Do not infer success merely because cancellation was requested or the browser was closed.
- If the operation times out or cannot be safely completed, record **Unknown (outcome-unknown)** or **Interrupted** as appropriate rather than inventing success or failure. These describe action outcomes; they do not add new TODO states or change the audit's final Interrupted status.
- After the deadline, proceed with resource cleanup without waiting indefinitely. Never replay uncertain or non-idempotent operations during recovery.

**Evidence, incremental persistence, and termination reason**

- Persist audit events incrementally during execution so unexpected application termination does not destroy the entire audit history. Preserve the records and artifacts actually saved; do not promise that forced termination can save every in-flight event.
- Preserve completed, trustworthy tool events, valid evidence, and fully verified findings. Keep incomplete checks and verification attempts clearly labeled; an interrupted audit does not imply that unfinished work passed.
- Save a partial **Interrupted** report with the specific recorded termination reason, such as **Application Shutdown**, **Budget Exhausted**, or another known terminal runtime condition. Never invent missing evidence or infer successful operations from incomplete execution.
- Findings retain a verified label only where the full evidence/reproduction gate was actually satisfied. Existing evidence provenance, privacy, and read-only report requirements remain in force.

**Resource and secret cleanup**

- Close the browser context and release Agent/runtime resources within the bounded shutdown process, preserving exclusive-control safety in every ownership mode.
- Discard temporary sensitive inputs and their references under **Sensitive Input Lifecycle**. Preserve securely stored AI provider credentials for future audits; temporary test secrets and provider credentials retain their distinct lifecycles.
- Forced process termination may prevent full cleanup or final report persistence. Do not claim cleanup succeeded without support; use the next-launch recovery behavior below for incomplete persisted sessions.
- Internal cancellation is independent of question dismissal and browser handoff. Neither restores execution once termination has begun, and no Pause, Resume, or Stop buttons are introduced.

**Next-launch recovery of incomplete persisted sessions**

- On the next launch, detect persisted sessions left incomplete by unexpected application termination and recover their trustworthy saved history, evidence, and findings into a partial Interrupted report.
- Use a specific termination reason when supported by persisted records; otherwise identify unexpected termination without inventing its cause, missing events, operation outcomes, or successful cleanup.
- Clearly identify unfinished checks, incomplete verification, and uncertain in-flight outcomes. Recovery finalizes an incomplete record for read-only inspection; it does not edit an already-final historical report, resume the previous audit, recreate its execution, or replay uncertain/non-idempotent operations.
- Temporary sensitive inputs are not restored from history. Securely stored provider credentials remain available for a future separately started audit under the existing authorization and preflight gates.

**Observable acceptance criteria**

- Shutdown, budget exhaustion, or another terminal runtime condition shows Terminating when possible and prevents new Agent/AI/browser/verification work from starting; supported pending requests receive cancellation signals.
- An in-flight operation receives only bounded safe completion handling: record an observed outcome within the deadline, otherwise Unknown/Interrupted, then continue cleanup without indefinite waiting or budget bypass.
- The saved Interrupted report preserves trustworthy completed work and identifies the recorded termination reason, incomplete verification, and uncertain outcomes without fabricated completion.
- After forced termination, the next launch recovers available incrementally persisted history into a partial Interrupted report without automatic execution or operation replay and without claiming missing cleanup succeeded.
- Bounded cleanup releases browser/Agent resources and discards temporary secrets where possible, while securely stored provider credentials remain available for future audits. Terminating retains the active-audit guard and adds no generic execution-control buttons.

Transient provider disconnection follows **Provider Connectivity and Automatic Recovery**; browser crashes, closed tabs, browser disconnections, and context failures follow **Browser Failure Detection and Automatic Recovery** while recovery remains permitted. Both exhausted recovery paths end as Interrupted through the bounded termination policy above. Non-retryable provider errors receive no automatic retries or provider/model switching; a provider failure ending an active audit is Interrupted. Runtime/browser/provider/budget interruptions remain distinct from Blocked permission outcomes. Internal termination never authorizes further recovery execution, unsafe replay, or a browser-ownership bypass.

### Evidence-Backed Findings

Source: `scope.md > Finding Verification Contract`.

| Category | Required meaning |
| --- | --- |
| Verified Finding | A reproducible issue supported by actual browser execution, sufficient evidence, and a clear mismatch between traceable expected behavior and observed behavior. |
| Suspected Finding | A potential issue with supporting observations but insufficient evidence, no reliable expectation, or unsuccessful independent reproduction. |
| UX Observation | A usability concern or improvement suggestion that is not necessarily a functional defect. |

A Verified Finding requires actual Playwright execution; documented expected and observed behavior; an expected-behavior source from user requirements, an explicit acceptance criterion, or a deterministic application contract; sufficient linked screenshots, executed steps, and browser state; at least one successful independent reproduction when safe and feasible; false-positive checks; and an explanation of the evidence-supported conclusion and limitations.

Capture DOM snapshots, console errors, and network failures when relevant. Check timing issues, navigation delays, test-environment failures, and incorrect test inputs. If evidence is incomplete, reproduction fails or cannot safely occur, or the expected behavior cannot reliably be established, downgrade to Suspected Finding or UX Observation as appropriate.

A temporary AI-provider failure must not be treated as a website defect. Preserve its actual execution status separately from target-application findings, including uncertainty or unfinished verification caused by the interruption.

Preserve valid pre-crash evidence and verified findings through browser recovery. Do not classify a browser-infrastructure crash as a website defect without independent supporting evidence. Crash-interrupted verification remains incomplete until a successful safe repetition; an unknown in-flight outcome is not proof that the operation failed or succeeded.

Every finding contains a title and description, verification category/status, severity, evidence-grounded confidence, expected versus actual behavior, reproduction steps, linked evidence, a suggested fix, and limitations or uncertainty. Unestablished expectations remain explicit. Confidence cannot substitute for verification; complex scoring is outside the proof of concept.

All evidence must originate from actual tool execution. Findings must be independently validated and the pipeline must remain application- and workflow-independent.

Manual browser actions must be recorded as User-originated, separately from Agent/Playwright execution. Their presence, or the state they produce, must not automatically count as verified Agent execution evidence. Existing Verified Finding requirements for actual Agent execution, traceable expectations, sufficient artifacts, and independent reproduction remain in force; disclose manual participation and any resulting coverage limitations without fabricating Agent actions.

### Contextual Findings and Dedicated Findings View

Source: `scope.md > The Core Loop` and `scope.md > Finding Verification Contract`; elaborated by the learner's workspace requirements.

- New findings appear as contextual cards in the central Agent Activity Feed.
- A dedicated **Findings** tab or panel within the same workspace provides access to all findings.
- Finding inspection includes verification status, severity, expected versus actual behavior, reproduction steps, linked evidence, and suggested fixes, together with the existing required title/description, evidence-grounded confidence, and limitations/uncertainty.
- Users can inspect finding details and evidence without interrupting the active audit. Opening the Findings view does not pause, stop, restart, or redirect agent execution.
- Finding data stays associated with the project/session being inspected. The active audit's findings remain synchronized with its live execution and recovery, while previously saved sessions are inspected read-only without mixing their findings or evidence with the active audit. A narrow window provides an accessible Findings tab.

### Read-only Audit Overview

Source: `scope.md > The Core Loop`, `scope.md > Finding Verification Contract`, and `scope.md > What "Working" Looks Like`; elaborated by the learner's explicit saved-audit overview requirements during the PRD interview.

Opening a saved **Completed**, **Blocked**, or **Interrupted** audit shows a polished, read-only Audit Overview that summarizes its recorded execution and findings before individual issues are opened.

**Overview content**

- **Audit identity:** Project name, target localhost URL, original user goal, execution date, duration, and final status, drawn from the saved audit's records.
- **Findings summary:** Separate counts for **Verified Findings**, **Suspected Findings**, and **UX Observations**. Show severity distribution when available. Verification classification and severity remain distinct; do not combine them into one status or imply severity establishes verification.
- **Executive summary:** A concise, evidence-grounded account of what was tested, what was observed, and the most important outcomes. Never invent conclusions about untested areas or imply that incomplete checks passed.
- **Execution progress:** Final TODO states, completed and incomplete checks, browser action counts, and collected evidence counts where available. Distinguish manual User actions from Agent executions in history and any relevant action counts; manual interactions must not inflate verified Agent execution. Use recorded data only, with unavailable metrics left unavailable and uncertain outcomes not described as confirmed success.
- **Findings preview:** A short list of the most important findings showing title, verification classification, and severity, with access to the full evidence-backed details defined under **Contextual Findings and Dedicated Findings View**.
- **Saved activity and evidence:** Read-only access in the same workspace to the saved activity feed, actual tool events, screenshots, reproduction steps, and evidence artifacts. Viewing reproduction steps or saved content does not execute them.

**Completed, Blocked, and Interrupted**

- Show the saved final status clearly and keep it distinguishable from any other audit's global active-state indicator.
- Completed means execution actually finished, with coverage limitations explicitly disclosed where applicable. It does not justify conclusions about untested areas or a blanket claim that the target application is defect-free.
- A Blocked audit is clearly labeled as a **partial report** because no safe continuation remained after user denial, a hard security restriction, or an explicit Skip that withheld information required to complete the goal. Distinguish all three reasons, explain the blocking reason safely, and identify coverage limitations and work not completed. None is itself a website defect or technical failure; Skip is not an inferred answer or denial.
- An Interrupted audit is clearly labeled as a **partial report** because execution ended through a runtime, browser, provider, or budget failure/interruption. Explain the technical interruption reason when safely available, without exposing keys, sensitive payloads, secret answers, or internal reasoning. Do not substitute a permission-blocking reason for a technical one.
- Identify incomplete checks, unfinished verification, and unverified work without implying successful audit completion. Missing or unsafe-to-display interruption details must not be invented.
- Preserve the established finding categories and evidence requirements: a partial report does not promote unsupported findings or manufacture completion, metrics, or evidence.

**Read-only presentation and navigation**

- Preserve the premium off-white visual language and consistent typography. Use clear hierarchy, subtle status indicators, and spacious cards rather than a dense analytics dashboard.
- Make the findings preview, full finding details, saved activity, and actual evidence easy to navigate within the same workspace.
- Historical sessions remain strictly read-only. Overview inspection must not mutate the recorded session or automatically restart or resume its audit.
- Never fabricate metrics, evidence, execution steps, or summaries to fill missing information; communicate the limitation instead.
- If another audit is active, it continues independently under **Project Navigation During an Active Audit**. Keep historical content distinct from its live state, and preserve the global indicator and pending-question notification/return behavior.

### Local Projects, Sessions, and Reports

Source: `scope.md > The Core Loop` and `scope.md > Execution and Product Breadth`.

Users can create and save multiple projects and audit sessions locally, and reopen reports and linked evidence after restarting the application. Recent projects appear in the narrow, collapsible left sidebar with distinctive letter-based icons, alongside New Audit and Settings. Other projects' saved sessions, findings, evidence, and reports are available read-only during an active audit, using the global indicator and context-preserving active-audit return behavior above. Questions and non-sensitive answers are preserved in the local audit history. For sensitive answers, retain only non-sensitive metadata such as question type and answered status; never the value. Internal cancellation preserves trustworthy partial evidence and labels interrupted results incomplete. An Interrupted session after exhausted provider or browser recovery is saved locally with its trustworthy partial results and evidence for later inspection. A Blocked session saves its partial read-only report, distinct blocking reason, completed events, valid evidence, previously verified findings, and coverage limitations; show its Blocked status clearly in history. Only one audit executes at a time; New Audit cannot create a second or empty session while another is active, and becomes available for creation/start after a terminal Completed, Blocked, or Interrupted outcome. Saved audits in all three terminal states open the established read-only Audit Overview, with full finding details and evidence available in the same workspace; opening them never starts or resumes execution.

**Saved-session entry fields**

- **Audit title:** A concise title derived from the original user-defined goal, without invented testing outcomes or sensitive preview content.
- **Final status:** Clearly display Completed, Blocked, or Interrupted from the saved session.
- **Started:** Show the local date and time when the audit started, based on its recorded start time.
- **Duration:** Show the recorded audit duration when available; do not invent unavailable metrics.
- **Finding counts:** Show Verified Findings and Suspected Findings as separate counts. Include the UX Observation count when space allows. Preserve accurate classifications and never combine the three categories into a misleading total.
- **Partial-report reason:** When applicable, show a short, safely worded blocking or interruption reason. Preserve the established distinction between denial, policy restriction, explicitly skipped required information, and technical interruption; do not expose sensitive inputs, raw credentials, or unsafe diagnostic payloads.

**Stable chronological ordering**

- Within each project, sort saved sessions by their recorded start time, newest first.
- Use the stable session ID as a deterministic tie-breaker when start times are equal.
- Viewing a session or updating its report must not automatically reorder the list. Ordering is based on the recorded start time and stable ID, not last-viewed or report-update time.

**Compact presentation, empty state, and navigation**

- Keep the list clean and visually compact, with clear typography and subtle status indicators consistent with the established off-white workspace.
- A project with no saved sessions shows an elegant empty state. Do not fabricate entries, results, or sessions to fill it.
- Clicking a saved session opens its saved, read-only **Audit Overview**. Opening historical sessions never restarts execution or disrupts another active audit, and the established global indicator and history/live separation remain in force.
- Session previews must not display sensitive inputs or raw credentials, including in goal-derived titles and reason text. Apply the existing sensitive-output restrictions to all preview fields.

**Observable acceptance criteria**

- Each saved entry shows its concise goal-derived title, final status, local start date/time, recorded duration when available, separate Verified/Suspected counts, UX Observation count when space allows, and a safe short reason for Blocked/Interrupted when applicable.
- Sessions sort newest-started first; equal start times use the stable session ID deterministically. Opening an older session or updating its report does not change that ordering.
- Clicking an entry opens its read-only Audit Overview without browser execution, audit restart, or disruption of another active audit.
- No saved sessions produces the compact, elegant empty state. Neither populated nor empty lists fabricate data, merge finding classifications misleadingly, or expose sensitive inputs/credentials.

## States and Boundaries

Source: `scope.md > Execution and Product Breadth` and `scope.md > Mandatory PRD Requirements`.

- **Terminating:** Internal shutdown, budget exhaustion, or another terminal runtime condition immediately blocks new Agent steps, AI requests, browser operations, and verification attempts. Show Terminating when possible, cancel pending requests where supported, handle in-flight operations only within the short configurable safe cleanup deadline, then clean up and save an Interrupted partial report with the recorded reason. Keep the active-audit guard throughout termination; ownership does not authorize continued execution.
- **Incomplete persisted session found on next launch:** Recover trustworthy incrementally saved history, evidence, and findings into a partial Interrupted report, with the supported termination reason and unfinished/uncertain work identified. Do not resume execution, replay uncertain/non-idempotent operations, restore temporary secrets, or invent missing events or cleanup success.
- **First launch:** New Audit empty state with the setup entry point.
- **Setup validation or navigation failure:** Preserve entered form data. Configuration validation and preflight checks gate progression and execution.
- **Configure Audit incomplete or unauthorized:** Required name, goal, valid localhost port, and explicit permission must pass validation before proceeding. Authorization starts unchecked for every new audit, including existing projects. No active audit or browser automation is created before all validation, authorization, and preflight gates succeed.
- **Review & Start:** Show the exact resolved localhost target, project name, and goal. Automatically run individual provider/model, target-availability, authorization, and budget checks as Checking/Passed/Failed, with Start Audit disabled until all pass. Failed checks provide actionable Retry Checks without data loss; configuration changes invalidate affected results, and critical conditions are revalidated immediately before activation. Preflight is not audit execution.
- **Setup closed or reopened:** Opening/dismissal creates no empty project/session and starts no audit. Preserve non-sensitive draft fields and relevant progress for continuation from the last relevant step, with a clear Start Fresh option. Clear authorization on dismissal; reopening requires explicit reconfirmation and rerun preflight, never restored secrets or automatically trusted prior checks. Securely saved provider configuration may be reused without exposing its secret.
- **Running:** Autonomous execution by default with synchronized real activity, TODOs, native embedded Chromium, and findings. The Agent owns the shared browser by default; explicit exclusive handoff can change its owner. No persistent composer, general messaging, or generic manual execution controls are introduced.
- **User owns browser control (ownership state):** Direct interaction is allowed only after explicit safe handoff, and Agent browser operations are suspended. The audit remains active and subject to budgets/internal cancellation; ownership is distinct from the audit's terminal status. Show You are in Control and Return Control to Agent; suspend browser-dependent Agent work as well as Agent browser operations.
- **Awaiting Control Decision (ownership state):** After a crash during Handoff Pending, cancel the incomplete handoff and enter this state following successful bounded recovery. Keep autonomous Agent execution suspended and require an explicit Take Control or Return Control to Agent selection. Apply exclusive ownership and the existing state-inspection/continuation gates. This remains an active audit and does not introduce general execution controls.
- **Browser control returned to Agent:** Confirm exclusive Agent ownership and inspect actual current browser state before continuing. Record manual actions as User-originated, not verified Agent execution or fabricated Playwright events.
- **Completed:** Execution has actually finished and the header shows Completed, with results/evidence available for review and coverage limitations explicitly disclosed where applicable. This state must not be fabricated for blocked or interrupted work.
- **Blocked:** No safe goal-relevant continuation remains after a necessary operation was user-denied/policy-prohibited or an explicit Skip withheld information required to complete the goal. Distinguish denial, hard restriction, and explicit Skip; preserve trustworthy completed work and save a partial read-only report with incomplete TODOs/verification and coverage limits. Show Blocked in the workspace, history, and overview; it is not a technical failure or website defect, and Skip never implies denial or authorization.
- **Question response invalid or incomplete:** Remain Awaiting Input; show clear inline schema-validation errors without losing entered data or exposing sensitive values. Both UI and trusted runtime enforce validation, and invalid input never resumes execution.
- **Question explicitly skipped:** Resolve only when the schema supports Skip; record a distinct outcome with non-sensitive metadata. Evaluate safe alternatives and record skipped work/coverage impact if continuing. If required information is missing and no safe continuation remains, end as Blocked without invented answers, permission, actions, findings, or verification.
- **Reconnecting:** Show persistent provider-recovery status and concise progress while suspending further planning and preserving the actual shared browser/session and audit state. Retry eligible AI requests up to three times within budget. Do not implicitly reclaim a User-owned browser; Agent browser continuation requires Agent ownership and fresh actual-state inspection.
- **Browser Recovering:** Suspend further execution and preserve actual completed events, TODO states, verified findings, and valid evidence. Attempt recovery up to twice, re-establishing the native embedded view and Playwright against the same recovered session. Re-establish exclusive ownership before Agent browser work; inspect actual state and preserve the existing no-replay/authentication-uncertainty rules. Apply the established crash-time ownership policy: restore User Control after a User-Control crash, or cancel a pending handoff and recover into Awaiting Control Decision. Require the specified explicit user selection before Agent continuation; technical feasibility still requires 4-spec validation.
- **Awaiting Input:** Safely hold the pending question before showing its inline card; keep TODOs and the browser view area accessible, indicating recovery unavailability. Only a valid runtime-accepted answer or explicitly supported Skip resolves the question. Safe continuation remains subject to budget, recovery, ownership, permissions, and termination; it never implicitly reclaims a User-owned browser. Invalid responses stay pending, and required questions without Skip support cannot be bypassed. Generic execution controls remain excluded.
- **Pending question dismissed or minimized:** The question stays pending and execution stays in Awaiting Input. A persistent Answer Pending Question action reopens the card. Dismissal never supplies an answer, cancels the question, or resumes execution; these question-presentation actions do not provide manual control of execution.
- **Eligible operation awaiting approval:** Show the exact proposed action, target, consequences, and affected resources in an `ask_user` card with Approve/Deny and no preselected approval. Keep Awaiting Input until the explicit decision; silence, dismissal, and timeouts cannot authorize execution.
- **Operation denied:** Do not perform it or retry it through another route. Record the skipped operation and coverage impact; seek a safe, goal-relevant alternative and continue autonomously if one exists without bypassing denial/policy. If no safe continuation remains, end as Blocked. Never fabricate execution or completed verification.
- **Hard-restricted operation or out-of-boundary navigation:** Block it under the MVP policy, even if an approval response or website content requests it. Initial target authorization and single-operation approval do not override hard restrictions. Record the policy restriction and coverage impact, seek a genuinely permitted alternative, and end as Blocked only if no safe continuation remains.
- **Sensitive input supplied:** Entry is masked by default, the value is limited to the authorized operation, and it is released with its references as soon as practical after consumption. Only non-sensitive response metadata can be retained.
- **Internal cancellation / audit failure / audit end:** Discard unused secrets. Cancellation for application shutdown, critical failure, exhausted budgets, or other safety conditions also preserves trustworthy partial evidence and labels incomplete results clearly.
- **Interrupted after provider- or browser-recovery exhaustion:** The audit ends after eligible provider retries or the two browser-recovery attempts fail. Browser resources and temporary sensitive data are cleaned up, trustworthy partial results/evidence are saved locally, and unfinished checks/verification are clearly incomplete. Do not fabricate completion or verification results.
- **Non-retryable provider error:** No automatic retry or provider/model switching. If a provider failure ends an active audit, use Interrupted with a safe technical reason, partial-result preservation, and cleanup; it is neither Blocked nor a website defect. A setup/preflight failure still leaves the audit unstarted.
- **Browser action interrupted by a crash:** If completion cannot be established, record interrupted or outcome-unknown. A crash does not prove failure; do not automatically repeat a non-idempotent action. Verification remains incomplete until successfully repeated under safe conditions.
- **Saved Completed audit opened:** Show the read-only Audit Overview first, with recorded identity, separate classification counts, available severity/progress metrics, grounded summary, finding previews, disclosed coverage limitations, and saved activity/evidence access. Do not restart/resume execution or infer outcomes for untested areas.
- **Saved Blocked audit opened:** Show a partial read-only overview labeled Blocked, distinguish user denial, policy restriction, or explicitly skipped required information as the reason, and disclose coverage limitations. Preserve trustworthy completed work; incomplete TODOs and verification stay not completed. Never show skipped/blocked work as executed or as a website defect, or Skip as an answer/denial/authorization.
- **Saved Interrupted audit opened:** Show the same read-only overview with a clear partial-report/final-status indication, safely available interruption reason, and incomplete or unverified work identified. Preserve valid evidence and finding classifications without inventing completion or missing data.
- **Project without saved sessions:** Show an elegant empty state in its saved-session list using the established compact visual language. Do not create placeholder audit sessions, invent results, or disturb a globally active audit.
- **Limited window space:** Prioritize the Activity Feed and provide accessible Browser Preview, TODOs, and Findings tabs. Resizing or navigating these observation views leaves execution independent and audit data synchronized.
- **Viewing another project's saved content:** Read-only inspection is available while the active audit continues independently in the background. The global indicator identifies its project and current state, with instant return to current feed/preview/TODOs. Browsing does not create a browser context or duplicate execution, and historical/live session content remains distinct.
- **New Audit requested while an audit is active:** Keep the action visible, explain the one-active-audit limit, and provide return to the active audit. No second audit, cancellation/replacement, or empty session is created. Awaiting Input and recovery states retain the active-audit guard.
- **Required question raised in the background:** Show a prominent global notification and Awaiting Input state, preserve the user's browsed navigation context when returning to the question, and keep the question pending until its required answer is submitted.
- **Active audit reaches Completed, Blocked, or Interrupted:** Creating and starting another audit becomes available under the existing one-active-audit and resource-cleanup boundaries; there is no automatic replacement or launch.

Execution stays within Windows 11 x64, Playwright with native embedded Chromium, an explicitly authorized target using the first-release fixed `http://localhost` host with a valid configurable port and initial path, one active audit, and one isolated shared browser session/context with a single tab. Playwright must attach to the exact displayed session, with exclusive Agent/User ownership rather than a duplicate hidden browser. Enforce authorized target/scope boundaries for both owners across redirects, popups, and navigation attempts, plus configured execution budgets. Prevent unapproved high-impact operations under the existing security policy. Runtime and persisted product data remain local; model requests use the selected BYOK provider, with no FlowProof AI accounts, hosted backend, or cloud database. Mandatory 4-spec validation must establish compatibility, isolation, and recovery feasibility for this requirement.

## Product Decisions

- **Autonomous default without general chat:** The goal is defined during setup and the workspace exposes actual execution, not a persistent composer. Structured `ask_user` responses and the explicitly revised browser-control handoff are the permitted execution-affecting user interactions.
- **Native embedded shared browser replaces the view-only/screenshot-option model:** Require continuously rendered Chromium inside the workspace, controlled by Playwright against the exact displayed session. Direct User interaction is supported only through explicit safe exclusive ownership transfer; no hidden duplicate browser or screenshot-streaming substitute qualifies.
- **Browser ownership is serialized:** Agent owns control by default. User ownership suspends Agent browser operations, and returning to the Agent requires actual state inspection. Manual action history remains distinct and does not automatically verify Agent execution. Generic Pause/Resume/Stop, general messaging, and audit-goal redirection stay excluded.
- **Premium three-zone workspace:** Use a narrow collapsible project sidebar, a central feed at approximately 60% of available content width, and a resizable right preview/TODO panel at approximately 40%. Major panels resize, the preview can enlarge, and the header persistently identifies the project, authorized target, and actual audit state.
- **Findings are inspectable during execution:** Contextual feed cards and a dedicated same-workspace Findings view expose the required finding details without interrupting the agent. Technical metadata is collapsed by default.
- **Responsive observation without runtime coupling:** When space is limited, prioritize the Activity Feed with accessible Browser Preview, TODOs, and Findings tabs. UI resizing and navigation do not control execution or desynchronize session data.
- **Non-disruptive read-only project navigation:** Other projects' saved audits, findings, evidence, and reports can be inspected while the active audit runs independently in the same application. A persistent global project/state indicator provides instant return to current live audit data; switching views creates no extra browser contexts or agent executions.
- **Visible New Audit with a single-audit guard:** While any audit is active, explain the limit and offer return to it rather than starting another, cancelling/replacing it, or creating an empty session. Once it is terminal, new audit creation/start is allowed.
- **Background questions preserve navigation context:** A global notification leads back to the active agent's pending question without losing the previously browsed context. Remain Awaiting Input until a valid answer or explicitly supported Skip resolves it; navigation cannot bypass the question.
- **Overview before individual issues:** Saved Completed, Blocked, and Interrupted sessions open a polished read-only Audit Overview with factual identity, distinct finding-classification counts and severity, grounded summary, recorded progress, important finding previews, and access to saved activity/evidence in the same workspace.
- **Honest historical and partial reports:** Historical sessions cannot be edited or automatically restarted/resumed by opening them. Blocked and Interrupted reports are explicitly partial with blocking-versus-technical reasons distinguished and unfinished work shown; Completed reports disclose coverage limitations. Untested areas, unavailable metrics, and missing evidence never acquire invented conclusions or values.
- **Inline questions preserve workspace visibility:** Prominent, non-blocking question cards live in the activity feed, with an Awaiting Input header state and the preview/TODOs still visible.
- **Dismissal changes visibility only:** An unanswered question remains pending, can be reopened through Answer Pending Question, and must not trigger an invented answer or automatic continuation. Required questions cannot be bypassed; Skip requires explicit question support. These are question-specific interactions, not execution controls.
- **Internal interruption preserves trustworthy results:** Runtime cancellation/cleanup handles application shutdown, critical failures, exhausted budgets, and other safety conditions. Preserve trustworthy partial evidence and mark incomplete results explicitly.
- **Automatic provider recovery:** Show Reconnecting, preserve the browser/session evidence, and retry eligible AI requests up to three times with bounded exponential backoff, jitter, and applicable Retry-After handling. No user intervention, retries of non-retryable errors, or automatic provider/model switching.
- **Request retries do not replay browser actions:** Record completed actions once, mark uncertainty honestly, and inspect actual browser state after recovery before continuing within budget.
- **Exhausted recovery ends as Interrupted:** Save trustworthy partial results and evidence locally, label unfinished verification incomplete, and release browser resources and temporary sensitive data through internal cleanup. Provider outages must not be reported as website defects.
- **Bounded automatic browser recovery:** Detect page/tab/browser/context failures, show Browser Recovering, suspend further execution, and attempt appropriate isolated page/context/Chromium recreation up to twice. Preserve completed events, TODO states, verified findings, and valid evidence; re-establish the actual preview and inspect state before safe continuation.
- **Crash does not imply action failure:** Mark uncertain in-flight actions interrupted or outcome-unknown, never automatically replay non-idempotent operations, and do not assume authentication/cookies/session storage survived. Request missing credentials or decisions through `ask_user`.
- **Explicit crash-time ownership restoration:** A User-Control crash triggers bounded recovery with autonomous Agent execution suspended; successful recovery restores User Control until explicit Return Control to Agent. A Handoff-Pending crash cancels the incomplete transfer and recovers into Awaiting Control Decision, requiring explicit Take Control or Return Control to Agent. Agent continuation still requires exclusive ownership, fresh inspection, plan/TODO reconciliation, and the established safety gates.
- **Trustworthy browser-recovery results:** Infrastructure crashes need independent evidence before becoming website findings; interrupted verification stays incomplete until safe successful repetition. Two failed browser-recovery attempts end as Interrupted with saved partial results and cleanup. Generic execution controls stay excluded; recovered native-session ownership must still be re-established.
- **Explicit sensitivity and ephemeral secrets:** Use structured normal/secret classification, always classify credentials as sensitive, and allow the user to mark a free-text answer sensitive. Mask entry by default, limit use to the authorized operation, release consumed values/references promptly, and discard unused secrets on internal cancellation, failure, or audit end.
- **Useful history without sensitive exposure:** Preserve questions and non-sensitive answers locally; retain only non-sensitive metadata for sensitive answers. Keep secret values out of persistence, activity output, UI screenshots, and exported evidence, and redact or omit sensitive browser/diagnostic artifacts where needed.
- **Distinct provider-key lifecycle:** AI provider keys retain secure OS-backed storage, separate from temporary test credentials and ephemeral question answers. JavaScript memory cleanup is best-effort rather than guaranteed erasure.
- **Contextual onboarding:** Three short setup steps, with Connect AI skipped by default for returning users and provider/model changes through Settings.
- **Validated fixed-host setup:** Require a human-readable non-empty project name, valid port 1–65535 for fixed `http://localhost`, and non-empty goal. Initial path is optional with `/` as default; project description is optional but recommended. Review shows the exact resolved URL and goal.
- **Explicit per-audit authorization:** Ownership/permission and defined-scope confirmation starts unchecked for every new audit and is never inferred from saved projects. Validation, authorization, and preflight must succeed before an active audit exists or browser automation begins.
- **Runtime scope and operation enforcement:** Authorized boundaries cover redirects, popups, and navigation attempts at the browser-runtime level. Risk-based permissions automatically allow understood low-risk goal-scoped interactions, require explicit approval for eligible meaningful side effects, and keep MVP hard restrictions in force.
- **One-operation approval without implicit consent:** Approval requests state the exact action, target, consequences, and resources, with explicit Approve/Deny and no preselected approval. Approve binds to one permitted operation; Deny skips it with a recorded limitation and safe continuation where possible. Silence, dismissal, timeouts, and untrusted page content never grant permission.
- **Hard restrictions precede approval:** Real financial transactions, irreversible destructive actions, and other high-impact operations are blocked by default in the MVP. No ordinary approval overrides hard policy or permits navigation outside the authorized localhost boundary.
- **Permission limits differ from technical interruption:** A denied/prohibited operation first triggers a search for a safe goal-relevant alternative, never an alternate route to the denied action. Continue autonomously if possible and record skipped work/coverage impact; otherwise terminate as Blocked with a partial read-only report. Completed means execution finished with disclosed coverage limits, while Interrupted means runtime/browser/provider/budget failure or interruption.
- **Predictable setup boundaries:** Preserve data across navigation/validation failures, and avoid unintended execution or empty sessions on dismissal.
- **Evidence earns verification:** Traceable expectations, real artifacts, independent reproduction, and false-positive checks support a verified label.
- **Premium, observable desktop experience:** Off-white workspace, polished startup and animated overlay, distinctive project letter icons, visible TODOs and actual browser state.
- **Product first:** Build FlowProof AI first; introduce the minimal sign-in fixture later for validation, preserving general-purpose goal-driven behavior.

- **Bounded internal cancellation and durable partial history:** Show Terminating when possible, prevent new work, signal supported request cancellation, and allow only bounded safe handling of already-running operations without budget bypass or blind interruption/replay. Persist events incrementally; save Interrupted with a specific recorded reason and honest uncertain outcomes. Bound resource/temporary-secret cleanup while retaining securely stored provider credentials. Next launch recovers incomplete persisted sessions for read-only inspection without restarting execution or inventing missing cleanup/evidence.
- **Schema-driven questions and distinct Skip:** Validate choice membership/counts, required non-blank text, reasonable lengths, and declared formats in both UI and trusted runtime. Inline errors retain entered data under privacy rules; invalid responses never resume execution. Only explicitly supported Skip resolves a question without an answer, never implying denial, permission, or authorization. Continue safe alternatives with recorded coverage impact, or end as Blocked if missing required information prevents the goal and no safe continuation remains. Retain only non-sensitive question metadata and the Skip outcome; never fabricate actions/findings/verification.
- **Compact chronological saved-session lists:** Show goal-derived title, final status, local start date/time, available recorded duration, separate Verified/Suspected counts, UX Observation count when space allows, and safe partial-report reasons. Sort by start time newest first with stable session ID tie-breaking; viewing or report updates do not reorder entries. Click through to read-only overviews, show an elegant empty state when needed, and preserve classification accuracy, preview privacy, and active-audit independence.
- **Automatic preflight and secure setup drafts:** Run transparent provider/model, localhost, authorization, and budget checks on Review & Start entry; gate Start Audit on all-pass results, invalidate affected checks on configuration changes, and revalidate critical conditions immediately before activation. Dismissal preserves non-sensitive draft data/progress for continuation or Start Fresh, but clears consent and invalidates prior preflight authority. Keep secrets out of ordinary draft storage and reuse securely saved provider configuration without exposing its key. Setup remains responsive and creates no empty project/session or accidental execution.

These product decisions are approved. Technical implementation choices and feasibility validation belong to `4-spec`; full implementation requires an approved technical specification.

## What We're Building

A complete, bounded desktop audit workflow with autonomous Agent control by default: account-free catalog-driven BYOK using Models.dev discovery and installed, registered AI SDK execution adapters; validated per-audit target/operation permissions; a premium resizable three-zone workspace with persistent status, actual activity, one native embedded Chromium session shared with Playwright, explicit exclusive browser-control handoff, evolving TODOs, and contextual/dedicated findings; non-disruptive history navigation and global audit notifications; structured `ask_user`; bounded provider/browser recovery; internal cleanup and truthful Completed/Blocked/Interrupted outcomes; strict evidence verification; and locally saved projects, sessions, reports, evidence, and read-only Audit Overviews. Manual browser actions are distinguished from Agent execution. The approved stack remains in `scope.md > Preserved Architecture and Stack`; same-session embedded-browser feasibility is subject to the mandatory 4-spec gate below.

### Browser Handoff Acceptance Criteria
- An active audit starts with Agent in Control and Take Control visible; observation alone cannot send competing browser input.
- Take Control visibly enters Handoff Pending, blocks new/queued Agent browser operations immediately, and keeps manual input disabled until the in-flight operation reaches a bounded safe completion point.
- A timed-out or uncertain operation records uncertainty and enters safe recovery rather than fabricated completion, blind non-idempotent replay, or concurrent control.
- User ownership shows You are in Control, enables authorized direct interaction, and suspends Agent browser operations and browser-dependent execution while retaining feed/TODO/finding access.
- Relevant manual interactions appear as User-originated history with privacy protection and never become fabricated Agent verification events.
- Return Control to Agent disables manual input before Agent reactivation, reinspects URL/page/DOM/relevant session conditions, reconciles plan/TODOs, and resumes only when safe without blind replay.
- Ownership transfer creates no second session or execution, bypasses no boundary or approval, and neither answers ask_user nor implicitly changes ownership when ask_user is answered.
- A crash during User Control attempts bounded recovery with autonomous Agent execution suspended. Successful recovery restores User Control; Agent execution cannot continue until the user explicitly selects Return Control to Agent and the existing inspection/continuation gates pass.
- A crash during Handoff Pending cancels the incomplete handoff and, after successful bounded recovery, displays Awaiting Control Decision with Take Control and Return Control to Agent. Neither recovery nor silence selects an owner or resumes autonomous Agent execution; the user's explicit selection follows the existing exclusive-control and continuation rules.
- After a User-Control or Handoff-Pending crash, recovery, silence, dismissal, timeouts, or ordinary workspace interaction never silently transfer ownership to the Agent or resume its execution; explicit Return Control to Agent and all established continuation gates are required.
- Agent execution cannot resume after recovery until the recovered session and authorized localhost boundaries have been validated, the actual current page state has been inspected, and TODOs and execution history have been reconciled with that state, in addition to the established ownership and continuation gates. Resumption must never blindly replay non-idempotent operations, including those whose prior outcome is uncertain.
- After a User-Control or Handoff-Pending crash, Agent execution resumes only when explicit Return Control to Agent authorization and all required safety checks have both succeeded. Selecting Take Control restores User ownership and does not authorize Agent resumption.
- If browser recovery fails after the approved two-attempt limit, end the audit as Interrupted, preserve and locally save trustworthy partial results, and clearly mark unfinished checks and verification as incomplete. Apply the established browser-resource and ephemeral-secret cleanup; never fabricate completion.

### Established Acceptance Criteria

- On first use with no active audit, selecting New Audit from the empty state opens the overlay with Connect AI, Configure Audit, and Review & Start. Configuration validation precedes progression; provider/model, localhost, and authorization checks precede execution.
- Configure Audit requires a non-empty human-readable project name, non-empty user-defined goal, and a valid port from 1–65535 for the fixed `http://localhost` host. Users cannot edit the host in the first release. URL path is optional with `/` as default; project description is optional but recommended.
- The authorization confirmation starts unchecked for every new audit and expresses ownership/permission and authorization to interact within the defined scope. Existing project history does not pre-authorize another audit. Required-field and authorization validation must pass before progression.
- Review & Start displays the exact resolved target URL and audit goal. Provider/model connectivity and localhost availability preflight checks succeed before activation; no active audit or browser automation begins before validation, explicit authorization, and preflight all pass.
- Browser-runtime target/scope enforcement covers redirects, popups, and navigation attempts, with popup handling preserving the single-controlled-tab boundary. Unapproved high-impact operations cannot execute; explicit required decisions use structured `ask_user` within the existing execution boundaries.
- Authorized navigation/inspection, DOM/accessibility/non-sensitive content reads, sanitized evidence capture, ordinary non-destructive UI clicks, understood goal-scoped low-risk form/input interactions, and validation testing without significant external side effects may proceed autonomously.
- Eligible meaningful persistent-data changes, external communications, file uploads/potentially sensitive transmission, administrative/security/permission changes, financial-category actions, uncertain potentially destructive/irreversible/externally visible effects, and policy-supported scope/sensitive-resource expansion require explicit operation-specific approval. Hard-restricted actions are not made eligible by belonging to an approval-required category.
- Approval requests show the exact action, target, potential consequences, and affected resources, with explicit Approve/Deny and no preselected approval. Approval authorizes one specific policy-permitted operation, not a blanket grant or automatic replay of a non-idempotent operation.
- Deny or a policy restriction prevents the operation, records skipped work and its coverage impact, and causes the agent to seek a safe goal-relevant alternative. Continue autonomously if one exists, without retrying the denied action through another route, bypassing policy, or reinterpreting denial as authorization. Dismissal leaves Awaiting Input; silence, dismissal, timeouts, generic Skip, or website content never count as approval. Denied/blocked work is not fabricated as executed or verified.
- If no safe continuation remains because a necessary operation was user-denied/policy-prohibited or an explicit Skip withheld information required to complete the goal, end as Blocked. The workspace, history, and saved overview distinguish denial, hard restriction, and explicit Skip from technical Interrupted outcomes; Skip is never treated as denial or authorization.
- A Blocked audit preserves completed events, valid evidence, and previously verified findings. Incomplete TODOs and verification attempts are not marked completed; a partial read-only report stores the blocking reason and coverage limits, with no claim that the blocked operation executed or that the restriction is a website defect.
- Final status semantics are consistent: Completed means execution finished with coverage limitations disclosed; Blocked means no safe continuation after denial, a security restriction, or explicitly skipped required information; Interrupted means runtime/browser/provider/budget failure or interruption. Skip, denial, authorization, and technical interruption remain distinct.
- Real financial transactions, irreversible destructive actions, and other high-impact operations are blocked by default in the MVP. Approval cannot automatically override a hard restriction; out-of-boundary navigation stays blocked and page content is untrusted data rather than authorization.
- Returning users skip Connect AI by default and can reach provider/model changes through Settings.
- Navigation or validation failure retains form values; closing the overlay starts no audit and creates no empty audit session.
- Starting an audit transitions into a workspace with a central autonomous activity feed, visible dynamic TODOs, and actual Playwright browser state. There is no persistent chat composer or general-purpose execution-time messaging.
- The live browser is real embedded Chromium with native continuous page rendering, including animations, scrolling, navigation, typing, and dynamic updates. Playwright controls the exact session displayed to the user; screenshot streaming, simulated rendering, or a separate hidden automation browser does not satisfy this requirement.
- Agent owns browser control by default. Direct User input requires an explicit safe handoff, never simultaneous control; while User owns control, Agent browser operations are suspended. Explicit return to Agent requires inspection of the actual current state before continuation.
- Manual browser actions are clearly User-originated in history, distinct from Agent/Playwright tool actions. They are not automatically counted as verified Agent execution evidence or as a replacement for independent Agent validation.
- Embedded content stays isolated from privileged Electron functionality, and authorized localhost navigation boundaries apply to both owners. Handoff preserves one active audit and one isolated shared session/tab; compatibility, policy enforcement, and crash recovery must be validated during 4-spec.
- The narrow, collapsible left sidebar shows recent projects, distinctive letter-based icons, New Audit, and Settings. After the sidebar, the initial content split is approximately 60% central feed and 40% resizable right panel, with major panels resizable.
- The central feed shows autonomous progress, actual Playwright tool events, observations, verification progress, contextual finding cards, and prominent `ask_user` questions. Technical metadata starts collapsed; tool events expand to show technical details and linked evidence.
- The right panel shows actual browser state above dynamic TODOs, offers preview enlargement, and uses pending, in progress, completed, blocked, and explicitly permitted skipped TODO states. Preview and TODOs stay visible during normal execution when dimensions allow.
- The persistent header shows the project name, authorized localhost target, and actual state, including Running, Awaiting Input, Reconnecting, Browser Recovering, Completed, Blocked, and Interrupted. Unavailable or recovering content is labeled honestly.
- A dedicated Findings tab or panel within the same workspace exposes all findings and their required status, severity, expected/actual behavior, reproduction steps, evidence, suggested fixes, and other established finding fields. Findings can be inspected without interrupting an active audit.
- Resizing panels, enlarging the preview, collapsing the sidebar, or navigating observation views does not pause, stop, restart, or redirect the agent. Activity, actual browser state, TODOs, and findings stay synchronized to the same audit.
- In limited window space, the Activity Feed takes priority and accessible Browser Preview, TODOs, and Findings tabs provide the supporting views. This layout change does not fabricate activity or affect execution.
- Users can navigate to other projects and inspect saved sessions, findings, evidence, and reports read-only while the active audit continues independently within the same desktop application. This navigation cannot pause, cancel, restart, modify, or duplicate execution or create additional browser contexts.
- A persistent global indicator shows the active audit's project and actual state across views. Returning to it immediately presents its current feed, actual browser preview, and TODOs, keeping historical session content distinct from live audit data.
- New Audit stays visible while another audit is active, explains the one-active-audit limit, and offers return to the active audit. It starts no second audit, does not cancel or replace the active one, and creates no empty session, including during Awaiting Input or recovery.
- A question raised while another project is being viewed creates a prominent global notification. Returning to it preserves the previous navigation context; remain Awaiting Input until a valid answer or explicitly supported Skip resolves it, subject to internal safety cancellation. Navigation cannot bypass a required question without Skip support.
- After the active audit reaches Completed, Blocked, or Interrupted, users can create and start a new audit under the existing cleanup/single-audit boundaries; navigation and earlier blocked actions do not implicitly start one.
- An active audit exposes no generic Pause/Resume/Stop, free-form messaging, or audit-goal redirection controls. Execution-affecting user interaction is structured `ask_user` plus the explicit exclusive browser-control handoff and User-owned direct input. Ordinary UI resizing/navigation/enlargement does not implicitly transfer ownership.
- An `ask_user` question is presented only after execution has paused safely. A prominent card appears inside the Agent Activity Feed and the header shows Awaiting Input, while the browser preview area and TODOs remain visible. An unavailable recovering session is explicitly indicated rather than presented as a live preview.
- `ask_user` supports single-choice, multiple-choice, and free-text responses with strict UI/runtime schema validation. Only a valid accepted answer or explicitly supported Skip resolves the question and allows safe continuation; recovery-related answers continue recovery first, and normal execution waits for a safe inspected browser state. Skip never invents an answer or grants permission.
- Dismissing or minimizing an unanswered question does not cancel it, supply an answer, or resume the agent. Answer Pending Question remains visible and reopens the pending card.
- Required questions without Skip support remain pending until a valid answer is accepted. Skip is shown and accepted only when explicitly supported and follows the distinct outcome/alternative/Blocked behavior under **Structured Clarifications Through ask_user**. Waiting and safe resumption are automatic, without generic execution controls.
- Internal cancellation/cleanup handles application shutdown, critical failures, execution-budget exhaustion, and other safety conditions. Trustworthy partial evidence is preserved, interrupted results are clearly incomplete, and unfinished checks are not reported as successful.
- A transient provider failure, timeout, or retryable provider error enters Reconnecting, suspends further planning, and preserves the active browser session, TODOs, completed tool events, collected evidence, and findings. The preview and TODOs stay visible with persistent status and concise progress updates.
- Eligible failed AI requests receive at most three automatic retries with bounded exponential backoff, jitter, and applicable Retry-After handling, within configured execution budgets. Invalid API keys and insufficient quota are not automatically retried, and provider/model selection is not automatically changed.
- Recovery never replays browser actions solely because an AI request failed. Completed actions are recorded exactly once; uncertain outcomes remain marked as uncertain. Actual browser state is inspected before automatic continuation after connectivity returns, and continuation requires remaining budget.
- Provider recovery must not seize User ownership; Agent browser continuation requires ownership returned to the Agent and actual state inspected. Browser recovery rebinds the embedded view and Playwright to the same recovered session and re-establishes exclusive control before Agent browser work resumes.
- Exhausted recovery ends the audit as Interrupted, preserves and locally saves trustworthy partial results/evidence, marks unfinished verification incomplete, and releases browser resources and temporary sensitive data through internal cleanup.
- Provider-error messages expose no API keys, sensitive request payloads, or internal reasoning. Provider outages do not become website-defect findings, fabricated successful tool events, or unsupported verification claims.
- A page crash, closed tab, browser disconnection, or unexpected context failure enters Browser Recovering, suspends further execution, and preserves completed events, TODO states, verified findings, and valid persisted evidence. The activity feed and previous findings remain accessible and an unavailable preview is explicitly marked.
- Browser recovery attempts appropriate isolated page, context, or Chromium recreation up to twice within the existing execution budgets and single-context/single-tab boundaries. The preview is re-established from the actual new session; actual browser state must be inspected before safe automatic continuation.
- A crash never implies the last action failed. In-flight actions without established completion are interrupted or outcome-unknown; form submissions, purchases, deletions, account changes, and other non-idempotent operations are not automatically replayed. Authentication, cookies, and session storage are not assumed to survive; missing credentials or decisions use `ask_user` and the established secret lifecycle.
- Valid pre-crash evidence and verified findings are preserved. Infrastructure crashes do not become website-defect findings without independent evidence, and interrupted verification remains incomplete until successfully repeated under safe conditions. No screenshots, events, or action successes are fabricated.
- If two browser-recovery attempts fail, the audit ends as Interrupted, trustworthy partial results are saved locally, unfinished checks are clearly labeled, and browser resources and temporary sensitive data are cleaned up without adding generic Pause/Resume/Stop controls. The explicit browser-handoff requirement remains separate.
- Questions and non-sensitive answers appear in local audit history. A sensitive answer retains only non-sensitive metadata, such as question type and answered status, without storing its value.
- `ask_user` declares normal or secret input structurally; passwords, tokens, API keys, recovery codes, and similar credentials are always sensitive, and users can mark a free-text answer sensitive. Sensitive entry is masked by default.
- Sensitive answer values are not persisted to SQLite, activity history, TODOs, logs, traces, analytics, or generated reports, nor exposed in renderer logs, tool output, screenshots of FlowProof AI's interface, or exported evidence. Defense-in-depth redaction covers logs/evidence metadata; sensitive browser screenshots, Playwright traces, or diagnostics are redacted or omitted where necessary.
- Secrets are used only for the explicitly authorized operation, with raw LLM exposure avoided where possible in favor of a temporary opaque reference for an authorized browser tool. Consumed values and references are released as soon as practical; unused secrets are discarded on internal cancellation, failure, and audit end.
- Temporary test credentials follow the ephemeral lifecycle independently of securely stored AI provider keys. Product wording and behavior do not claim guaranteed JavaScript memory erasure.
- Progress, actual tool events, structured questions/answers, TODOs, browser events, and findings remain synchronized to the current audit.
- Each Verified Finding satisfies the complete evidence gate. Missing expectations, evidence, or successful reproduction cannot yield a verified label.
- Saved projects, sessions, reports, and linked evidence reopen locally after an application restart. One audit can execute at a time within the authorized localhost boundary.
- Opening a saved Completed, Blocked, or Interrupted audit first presents a polished read-only Audit Overview containing project name, target localhost URL, original goal, execution date, duration, and saved final status.
- The overview separately counts Verified Findings, Suspected Findings, and UX Observations, and shows severity distribution when available without conflating verification and severity.
- Its concise executive summary describes only recorded testing, observations, and important outcomes. Execution progress uses actual final TODO states, completed/incomplete checks, and browser-action/evidence counts where available; no metrics or conclusions are fabricated for missing or untested work.
- A short important-findings preview shows each title, verification classification, and severity with access to full evidence-backed finding details. Saved feed entries, tool events, screenshots, reproduction steps, and evidence remain accessible read-only within the same workspace.
- Blocked and Interrupted overviews are explicitly partial and identify unfinished/unverified work without invented completion. Blocked reasons distinguish user denial, hard restriction, and explicitly skipped required information; Interrupted reasons describe safely available technical/runtime/browser/provider/budget failure. Completed overviews disclose coverage limitations; unsupported findings are never promoted.
- Overview styling uses the established off-white language, consistent typography, spacious cards, subtle status indicators, and clear hierarchy. Historical session inspection is strictly read-only and never automatically restarts/resumes the saved audit or interrupts a different active audit.

The established acceptance criteria define the required POC behavior, with no remaining recorded product questions before final review. Native continuous rendering and exact-session fidelity are fixed requirements; technical limitations must be reported during 4-spec before any UX change is proposed. The later sign-in acceptance fixture, short demo video, and public GitHub repository remain as described in `scope.md > Acceptance Fixture and Implementation Order`.

## Deferred From the POC

Source: `scope.md > Later`.

- Cross-platform distribution beyond Windows 11 x64.
- Additional browser engines and broader browser-session/tab support.
- Concurrent audits and multi-agent execution.
- Non-localhost targets, with appropriate authorization boundaries in a later release.

These are deferred to preserve the approved first-release execution limits. Architecture remains extensible.

## Non-Goals

Source: `scope.md > Explicitly Cut`.

- Two-way free-form chat, a persistent composer, or unsolicited audit-goal instructions during execution: the goal is established in setup and execution-affecting interaction follows structured `ask_user` and the explicit browser-ownership handoff. Ordinary workspace navigation, resizing, and inspection remain available without implicit transfer or execution changes.
- Generic user-facing Pause/Resume/Stop, audit-goal redirection, or uncoordinated direct browser control: autonomous Agent execution is the default, with structured `ask_user` and explicit exclusive browser handoff as the defined exceptions. Concurrent User/Agent browser control is prohibited; internal safety cancellation remains required.
- Screenshot-streaming substitutes for the live browser, duplicate hidden automation browsers, implicit ownership transfer, or manual actions relabeled as verified Agent execution: the requirement is native rendering of one actual shared Chromium session with honest action provenance.
- Hosted infrastructure, a cloud database, or FlowProof AI authentication/accounts: the product is local-first and account-free.
- Sign-in-specific product logic or a fixture-first build: the fixture validates the general audit workflow later.
- Fabricated reasoning, simulated actions, manufactured evidence, or unsupported verification claims: the activity feed and findings must reflect real execution.
- Complex scoring systems or unnecessary verification infrastructure: prioritize a genuinely working evidence-and-reproduction pipeline.
- Automatic provider/model failover, retries of non-retryable provider errors, or replaying browser actions solely because an AI request failed: recovery follows the bounded request-level policy and preserves execution integrity.
- Automatically replaying non-idempotent operations after a browser failure, assuming crashed actions failed or session state survived, or promoting crash-interrupted verification without a successful safe repetition: browser recovery must preserve execution integrity and trustworthy evidence.
- Persisting transient sensitive question answers or claiming guaranteed JavaScript memory erasure: secrets use the defined ephemeral lifecycle with best-effort memory management, separate from securely stored provider keys.
- Editing historical audit sessions, automatically restarting/resuming them when opened, or fabricating report metrics/summaries/evidence: saved audits are read-only and their overviews must reflect recorded execution and actual limitations.
- Blanket action approval, implied approval from silence/dismissal/timeouts/page content, hard-policy override through ordinary `ask_user` approval, or real financial/irreversible destructive execution in the MVP: permissions remain risk-based, specific, and subordinate to strict security boundaries.

## Mandatory 4-spec Validation

The learner explicitly requires validation of the embedded-browser approach during `4-spec`. **Feasibility is not yet established**, and this PRD update is not implementation permission or proof of compatibility.

- Investigate Electron WebContents embedding and BrowserView alternatives, Chromium DevTools Protocol integration, and Playwright CDP connectivity as candidate approaches. Do not assume an embedded Electron browser is automatically controllable by Playwright. Document compatibility constraints, security, exact-session fidelity, and recovery tradeoffs; these are investigation candidates, not selected architecture.
- Validate that the approved Electron/Chromium and Playwright setup can attach Playwright to the **exact native embedded session** visible in the workspace, including relevant compatibility constraints. Do not select a concrete connection/embedding mechanism without validating it.
- Validate isolation from privileged Electron functionality and enforcement of authorized localhost navigation for both Agent and User interactions. The shared view and handoff must not bypass existing security/action restrictions or sensitive-input/history protections.
- Validate exclusive control, safe handoff boundaries, required post-handoff state inspection, and honest attribution of manual versus Agent actions, within one active audit and one isolated browser session/tab.
- Validate native-view lifecycle and the established crash-recovery policy, including reconnection to the actual recovered displayed session, restoration of User Control after a User-Control crash, cancellation of an incomplete handoff and Awaiting Control Decision after a Handoff-Pending crash, explicit ownership choices with no silent Agent transfer, recovered-session/boundary validation, actual-state inspection, TODO/execution-history reconciliation, no duplicate hidden browser, and no unsafe replay. Recovery exhaustion after two attempts must preserve trustworthy partial Interrupted results.
- Record findings and limitations in the technical spec before its implementation blueprint is approved. If the requirement cannot be met safely on the approved stack, return to the learner for a product decision; do not silently replace native embedding with screenshot streaming or a second browser.

## Open Questions

No remaining recorded product-defining questions. The setup preflight/draft behavior, saved-session lists, structured questions, browser ownership/recovery, internal cancellation, evidence contract, and POC boundary are approved. The learner's explicit sign-off completes `3-prd` and authorizes `4-spec`.

The separately identified **Mandatory 4-spec Validation** remains a technical feasibility gate for the specification, not an unresolved product requirement. Exact implementation mechanisms and design tokens belong to that phase. The learner has authorized technical specification and feasibility evaluation; do not begin full implementation until the technical specification is completed and explicitly approved.
