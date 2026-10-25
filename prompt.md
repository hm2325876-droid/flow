# FlowProof AI — AI Provider Architecture Amendment
## Documentation Only · No Implementation

We have approved an architectural improvement to FlowProof AI's AI provider and model selection system.

**Repository:** `D:\FlowProof-AI`  
**Last completed implementation:** Slice 1  
**Slice 1 commit:** `78e3d09`

Your task is to update the approved project documentation to reflect this decision.

**DO NOT implement Slice 2. This is strictly a documentation and specification update.**

## 1. New Approved Decision

Replace the previous approach of limiting FlowProof AI to four hardcoded AI providers with:

**Models.dev for model discovery and capability metadata + Vercel AI SDK for actual provider integration and model execution.**

The goal is broad provider and model compatibility without manually implementing individual integrations from scratch.

### Models.dev responsibilities

Use Models.dev as the model catalog and discovery source.

Where available, leverage metadata such as:

- Provider and model identifiers.
- Display names.
- Tool-calling support.
- Structured-output support.
- Reasoning capabilities.
- Input/output modalities.
- Context and output limits.
- Pricing metadata.
- Provider SDK integration information.

Use the documented Models.dev API or an appropriate supported local catalog distribution.

Model metadata must be treated as advisory information, not proof of runtime compatibility.

### Vercel AI SDK responsibilities

Use Vercel AI SDK as the unified model execution abstraction.

Responsibilities include:

- Connecting to supported AI providers.
- Sending model requests.
- Handling streaming where appropriate.
- Supporting tool calling and structured responses where available.
- Normalizing the execution interface consumed by Agent Core.
- Handling provider-specific adapters behind a consistent interface.

Use existing official provider adapters wherever practical.

Do not implement a separate custom integration for every provider or model.

## 2. Provider and Model Selection

Replace the fixed four-provider selection model with a catalog-driven system.

The UI should support:

- Discovering and searching providers.
- Discovering and searching models.
- Filtering by relevant model capabilities.
- Selecting a provider and model.
- Entering a provider-specific API key where required.
- Clearly distinguishing supported, unsupported, and unverified models.
- Displaying useful model metadata when available.

The provider list must not be arbitrarily restricted to the four originally specified providers.

However, **a model appearing in Models.dev does not automatically make it executable in FlowProof AI**.

Only providers supported by adapters actually installed and registered in the application can be selected for execution.

Do not dynamically install npm packages based on catalog metadata.

Do not execute remote code or trust arbitrary endpoints supplied by the catalog.

Do not promise universal compatibility with every model.

## 3. Runtime Compatibility

FlowProof AI is an autonomous browser-testing agent, so model compatibility must include more than basic text generation.

Document the distinction between:

1. Catalog metadata compatibility.
2. Installed AI SDK provider adapter availability.
3. Successful authenticated model connectivity.
4. Actual tool-calling compatibility required by the Agent.
5. Runtime reliability, which cannot be guaranteed by metadata alone.

A model must not be marked ready for autonomous execution solely because it advertises `tool_call: true`.

Specify a focused, real compatibility/preflight check where practical, with clear error handling for models that cannot support the required interactions.

Keep this validation lightweight. Avoid expensive or redundant test calls.

## 4. Catalog Reliability

Document a practical approach to:

- Fetching catalog metadata.
- Local caching.
- Offline fallback.
- Handling unavailable or stale catalog data.
- Maintaining stable provider/model identifiers.
- Avoiding misleading capability or pricing claims.

Metadata refresh failure should not unnecessarily block an already configured, previously validated supported model.

Pricing metadata is informational and must not be treated as guaranteed real-time billing.

## 5. Security and Credential Ownership

Preserve the already approved security architecture:

- Electron Main owns OS-backed API key storage.
- React Renderer never receives stored API key values.
- The Utility Process hosts the AI SDK provider execution.
- Keys are released to the trusted provider execution path only when necessary.
- Never log, persist in plaintext, or expose credentials in activity events.
- Apply strict validation to model identifiers and adapter selection.
- Catalog metadata must never be able to grant new permissions.
- No remote dependency installation or arbitrary code execution.

The current npm Workspaces monorepo architecture remains unchanged.

Do not create a new package.

All model discovery, compatibility, and provider execution interfaces should reside within the existing `packages/ai-providers` package, with only necessary contracts added to `packages/contracts`.

## 6. Slice 2 Scope Amendment

Update the Slice 2 definition to include:

- Models.dev-powered provider/model discovery.
- Searchable model selection with capability filtering.
- Vercel AI SDK provider adapters.
- OS-backed BYOK credentials.
- Provider/model connectivity checks.
- Practical agent-required tool-calling preflight.
- New Audit setup and authorization.
- Existing localhost target validation and audit-readiness checks.

Keep full autonomous agent execution in Slice 3.

Avoid implementing a complex provider marketplace, automatic adapter installation, or unnecessary catalog administration features.

Prioritize a working provider/model path over supporting every entry in Models.dev.

## 7. Files to Review and Update

Inspect the repository and update relevant existing documentation, including:

- `devpost/spec.md`
- `devpost/spec.html`
- `devpost/prd.md`, if its provider limitations now conflict with this decision
- `devpost/prd.html`, if the Markdown PRD is changed
- `devpost/scope.md`, only if required for consistency
- `devpost/scope.html`, if the Markdown scope is changed
- `devpost/checklist.md`
- Relevant architecture/progress metadata if necessary

Preserve all other approved functionality, behavior, security constraints, and completed Slice 1 evidence.

Keep Markdown and HTML companions synchronized.

Use the official Models.dev and Vercel AI SDK documentation to verify relevant APIs and terminology before recording technical details. Do not invent SDK methods or metadata fields.

## 8. Strict Boundaries

Do NOT:

- Install dependencies.
- Modify application source code.
- Create new packages or directories.
- Start Slice 2 implementation.
- Modify completed Slice 1 functionality.
- Change the Electron process architecture.
- Replace npm Workspaces.
- Add unnecessary abstractions or planning phases.
- Reopen settled architectural decisions.
- Push to GitHub.
- Start 6-ship.

This is a narrowly scoped amendment to the existing approved specifications.

## 9. Verification and Git

After documentation edits:

1. Review the complete diff.
2. Verify that no documentation still incorrectly claims FlowProof AI is restricted to four AI providers.
3. Verify that Models.dev is specified as the discovery/metadata layer and AI SDK as the execution layer.
4. Verify that supported provider adapters are distinguished from catalog-listed providers.
5. Verify that credential ownership and Electron security boundaries remain intact.
6. Verify that Slice 1 acceptance results remain unchanged.
7. Verify Markdown/HTML synchronization.
8. Stage only relevant documentation files.
9. Create one local documentation-only Git commit:

`docs: adopt models.dev catalog and ai sdk providers`

Do not push.

## 10. Final Response

Report concisely:

- Files changed.
- The updated provider/model architecture.
- How this changes Slice 2.
- Verification results.
- Git commit hash.
- Confirmation that no implementation or dependency installation occurred.

**STOP after the documentation-only commit. Wait for my explicit authorization before implementing Slice 2.**


.\generate.ps1 `
  -FirstFrameUrl "https://res.cloudinary.com/otjxhret/image/upload/f_auto,q_auto/Mediterranean_Earth_from_Orbit" `
  -LastFrameUrl "https://res.cloudinary.com/otjxhret/image/upload/f_auto,q_auto/Golden-Hour_Cairo_Rooftop_Apartment_Sign"