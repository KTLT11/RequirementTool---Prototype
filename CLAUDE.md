# Requirement Tool — Claude Code Project Instructions

## Project Objective

Build a Functional Interactive Prototype of Requirement Tool for leader review.

The application demonstrates the Shift-Left BA Requirement Quality Framework, from Incoming Request to Dev Handoff.

The prototype must be understandable to a first-time BA, with clear workflows, meaningful actions, connected information, traceability and realistic demo scenarios.

## Source of Truth

Use the project's existing reference documents when relevant:

1. Phase 2 — BA Requirement Framework: business workflows, modules, checkpoints, quality rules.
2. Phase 3 — Application/SRS: functional requirements and prototype scope.
3. QG-06 — Final Output Template Design Specification: CRD/DRD and document mapping.

Existing implemented code is the starting point, not automatically the authoritative business specification.

Do not invent business rules, confirmations or checklist criteria.

Do not read all reference documents for every task. Read only the relevant sections, using repository search or document indexes where possible.

If an essential document is unavailable, state the limitation rather than inventing its contents.

## Approved Technology

- React + Vite + TypeScript
- Tailwind CSS
- React Router
- React Context + useReducer
- Lucide React
- Mock data and deterministic prototype services

No production backend, database, authentication or real AI API unless explicitly requested.

Preserve the existing architecture and components.

## Design System

Warm Workspace:

- Primary: #C4622E
- Hover: #A85128
- Background: #FAF8F2
- Surface: #FFFFFF
- Secondary surface: #F4F0E6
- Text: #1C1A17
- Secondary text: #6B6456
- Border: #E6E2DA
- Success: #4D8654

Inter for the main UI. Lora only for selected large headings.

Follow the approved UX Redesign v2: task-driven, evidence-connected, compact, consistent and easy to understand.

Do not replace the existing Design System or redesign unrelated screens.

## Business Integrity

Preserve distinctions between:

- Known / Unknown / Assumption
- Evidence Reviewed / Evidence Confirmed
- BA Review / Customer Confirmation
- Quality Pass / Fail / Unknown / N/A
- Validation Current / Stale
- Ready / Ready but Blocked / Not Ready
- Dev Review / Dev Acceptance

AI suggestions do not become approved business decisions automatically.

Maintain traceability between input sources, extracted information, Discovery, Evidence, Gaps, Requirements, AC, Quality Findings and downstream documents.

CASE-DEMO-001 is the primary connected demonstration scenario.

Sample business decisions must remain identifiable as demo data.

## Engineering Rules

1. Continue the existing codebase. Never recreate the project unnecessarily.
2. Inspect existing implementations before adding new ones.
3. Reuse components, types, reducers, selectors and services.
4. Avoid duplicate entities, parallel state stores and redundant abstractions.
5. Keep domain logic outside UI components.
6. Preserve existing functionality unless explicitly instructed otherwise.
7. Implement working interactions, not cosmetic buttons.
8. Label simulated and preview-only behavior accurately.
9. Keep Demo Reset and downstream dependency behavior consistent.
10. Avoid unnecessary dependencies, large refactors and speculative architecture.

## Token & Credit Efficiency — Mandatory

- Start with a targeted inspection of relevant files.
- Prefer filename search, symbol search and short file excerpts.
- Do not print entire large files unless needed.
- Do not repeatedly reread unchanged files.
- Do not scan node_modules, dist, coverage, build artifacts or generated files.
- Do not read every reference document without a concrete reason.
- Make the smallest coherent code changes that satisfy the task.
- Do not rewrite functioning components for stylistic preferences.
- Do not create lengthy planning documents unless requested.
- Do not produce long progress reports or repeat requirements.
- Group related edits and verification commands sensibly.
- Do not repeatedly run full build/test suites without a meaningful change.
- When a task is straightforward, implement directly.
- For ambiguous or high-impact changes, ask one focused question before proceeding.

Optimize for correctness and maintainability, not minimum token count at the expense of quality.

## Verification

Run focused checks during implementation and relevant regression checks afterward.

Run TypeScript check and production build at the end when feasible.

Never claim a test passed unless executed.

Fix errors introduced by the current task.

Report unrelated pre-existing failures separately.

## Response Format

Keep responses concise.

At completion provide:

1. What was implemented.
2. Files changed.
3. Tests/build results.
4. Remaining limitations.

Do not generate additional documentation unless explicitly requested.

## Development Workflow

Implement only the current requested stage or task.

Do not start the next stage automatically.

Do not commit, push, deploy or delete significant user data without explicit permission.