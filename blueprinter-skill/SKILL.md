---
name: blueprinter-skill
description: Design agentic workflow blueprints from process documents or a live interview, choosing the best pattern (deterministic pipeline, AI router, parallel, orchestrator-workers, evaluator-optimizer, agent loop) and producing a shareable HTML blueprint page, a Business Requirements Document, and app-importable JSON. Use when the user wants to blueprint a business process, design an agent workflow, "build a blueprint", "interview me about a process", or turn interview notes / process docs into agent requirements. Differentiator - produces reviewable deliverables for business + engineering, not running code.
---

# Blueprinter

Turn a business process — described in documents or drawn out through an interview — into an agentic workflow blueprint with three deliverables:

1. `<slug>.blueprint.json` — structured blueprint (importable into the Agent Blueprint Builder app)
2. `<slug>.blueprint.html` — self-contained shareable page: diagram + full node specs + validation
3. `<slug>-BRD.md` — Business Requirements Document for the engineering handoff

## Workflow

### 1. Intake

Determine what the user has:
- **Documents / notes provided** (process docs, SOPs, interview transcripts): read them, extract the process, build the full draft in one pass. Ask at most one batch of clarifying questions for genuine blockers.
- **Nothing written down**: interview them — read `references/interview.md` first and follow the Discovery discipline (one question at a time, update the blueprint after every answer).
- **Existing blueprint to harden**: read `references/interview.md` and run Grill mode.

Also collect (or infer and confirm): process name, client/project, who the process owner is.

### 2. Choose patterns

Read `references/patterns.md`. Pick the simplest pattern that fits each stage of the process — deterministic pipeline by default; router/parallel/evaluator/orchestrator/agent-loop only when the work genuinely requires it. Tell the user which pattern(s) you chose and why in one or two sentences.

### 3. Draft the blueprint JSON

Read `references/ontology.md` and produce `<slug>.blueprint.json` in a `blueprints/<slug>/` directory (create it) following that schema exactly. Rules that matter most:
- `type` must equal `data.nodeType`; branching edges need `sourceHandle`
- Work nodes need goals; orchestrators need termination conditions; agent loops need stop conditions
- Irreversible outward-facing actions need `hitl.mode: "approval"`
- Mark anything you inferred (rather than were told) with `ai_confidence: "low"` + `ai_notes`
- Fill agent spec fields (skills, guardrails, success criteria, failure handling) — they are the engineering handoff

### 4. Validate and render

```bash
python3 scripts/render_blueprint.py blueprints/<slug>/<slug>.blueprint.json
```

The script validates (same rules as the app: E001-E007, W001-W010), prints violations, and writes the HTML page. Fix every ERROR and re-run until clean; fix WARNINGs unless the user explicitly accepted the gap. During an interview, re-run after each update so the page always reflects the current state.

### 5. Design review

Check the draft against `references/rulebook.md` (verifiable success criteria, bounded loops, human gates on irreversible actions, one-agent-one-concern, failure paths, orphaned data). Present violations with suggested fixes. For interview mode, offer a Grill pass. Do not skip this step.

### 6. Write the BRD

Read `references/brd.md` and write `<slug>-BRD.md` in the same directory following that structure. Section 8 (Key Decisions & Open Questions) must capture why patterns were chosen, rejected alternatives, and every low-confidence assumption with who should confirm it. If a docx capability is available in the session, offer to also produce `BRD.docx`.

### 7. Deliver

Summarize: the pattern(s) used, node count, validation status, open questions, and the three file paths. Remind the user the JSON imports into the Agent Blueprint Builder app (Import button) for interactive editing.

## Failure modes

- **Renderer reports errors on valid-looking JSON**: the usual causes are `type` ≠ `data.nodeType`, a branching edge missing `sourceHandle`, or an edge referencing a node id that doesn't exist. Read the error codes — they name the node.
- **User answers wander across many topics at once**: capture everything they said in the blueprint (a list is an unordered set — don't infer sequence), then ask the single most important follow-up.
- **Process too fuzzy to blueprint**: fall back to drafting a high-level pipeline of 3-5 stages with `ai_confidence: "low"` throughout and use Grill questions to firm it up.
