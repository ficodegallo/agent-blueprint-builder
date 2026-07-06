# Business Requirements Document structure

Write the BRD as markdown (`BRD.md`) alongside the blueprint. If the session has a Word/docx capability available, offer to also produce `BRD.docx` from the same content. The BRD is prose for business and engineering readers — it explains and justifies; the HTML page visualizes; the JSON is the data.

## Required sections

```
# Business Requirements Document: <Process Name>
<Client> · <Project> · Version <x> · <Status> · <Date> · Author: <who>

## 1. Executive Summary
1.1 Process Overview — 2-4 paragraphs: what the process does today, what the
    agentic design changes, and the headline pattern(s) used and why.
1.2 Impacted Audiences — bullets
1.3 Business Benefits — bullets, quantified where the owner gave numbers
1.4 Key Contacts — bullets

## 2. Process Flow Overview
2.1 Flow Narrative — walk the happy path start to finish in plain prose,
    then each branch/exception path.
2.2 Node Summary Table — | # | Name | Type | Who/What | Purpose |

## 3. Detailed Node Specifications
One subsection per node, in flow order. For each: purpose, inputs, work
performed (tasks / delegation / classification / criteria), outputs,
integrations. For agent nodes additionally: goal contract, skills/tools,
autonomy level, guardrails, success criteria, stop condition, failure
handling, and the human oversight policy (mode, reviewer, SLA, escalation).

## 4. Human Oversight & Escalation
Consolidated table of every HITL gate: | Node | Mode | Reviewer | SLA |
Escalation |. Then a short narrative on the overall oversight philosophy.

## 5. Integrations & Data
Systems touched, per-system: which nodes use it, actions, known API
endpoints, data in/out. Then a data-flow note: where each key data item
originates and which steps consume it.

## 6. Exceptions & Failure Handling
Every failure mode discussed and its handling path. Include what was
deliberately left unhandled and why.

## 7. Volumes, SLAs & Non-Functional Requirements
Volumes, deadlines, latency/cost budgets, loop bounds.

## 8. Key Decisions & Open Questions
8.1 Design decisions made, each with the reasoning and rejected alternatives.
8.2 Open questions / assumptions — anything marked ai_confidence low, with
    what was assumed and who should confirm.

## 9. Out of Scope
What this design explicitly does not cover.
```

## Writing rules

- State facts from the intake; never invent volumes, SLAs, or system names. Unknowns go in §8.2, not guessed inline.
- §8 (Key Decisions) is the highest-value section for the engineering team — capture *why* patterns were chosen and what was rejected.
- Keep prose tight; the node detail lives in §3, don't repeat it elsewhere.
