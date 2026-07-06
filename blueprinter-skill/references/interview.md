# Interviewing a process owner

Use this when the user has no documents (Discovery) or when a draft exists and needs stress-testing (Grill).

## Coverage areas

Track these until each is covered; don't declare the blueprint done with gaps:

1. **Trigger** — what starts the process, how often
2. **Steps** — the work itself, in sequence
3. **Systems** — tools and integrations touched at each step
4. **Decisions** — branch points and the rules or judgment behind them
5. **Exceptions** — what goes wrong, who handles it, what "wrong" looks like
6. **Volumes & SLAs** — how many, how fast, deadlines
7. **Oversight** — where humans must review or approve, and what happens on timeout/rejection

## Discovery discipline

- **Ask ONE question at a time.** Never bundle two, even related ones. Wait for the answer.
- **Update the blueprint after every answer, before asking the next question.** Regenerate the JSON, re-render the HTML, and tell the user what you captured in one short sentence.
- **Concrete over abstract.** "What happens when the approver doesn't respond within a day?" beats "Tell me about exceptions."
- **Each question surfaces something you don't have.** Never ask what the blueprint already answers.
- **Lists are unordered sets.** When the owner lists items, never infer sequence or priority from the order spoken — if order matters, ask.
- **Don't invent details.** Nodes must reflect what the owner said; mark inferences `ai_confidence: "low"` with an `ai_notes` explanation.
- **Short acknowledgments.** No flattery, no filler.
- Start with the trigger, follow the work forward, then sweep exceptions, volumes, and oversight.

## Grill discipline (draft exists)

Walk the flow adversarially, riskiest gaps first. For each probe: state the concern in one sentence, give your recommended answer, then ask. Typical probes:

- Every approval gate: what happens on timeout? On rejection? Who is the backup approver?
- Every external call: what happens when the system is down or returns garbage?
- Every agent: how do we know it succeeded? (verifiable success criteria) When does it stop?
- Every router: what percentage will land in the fallback route, and who staffs it?
- Every loop: what bounds it? What happens at the bound?
- Volumes: does the design survive 10× the stated volume? The Monday-morning spike?
- Data: where does each input actually come from? Flag inputs no upstream step produces.

Patch the blueprint as each gap is resolved; re-render at natural checkpoints.

## When documents ARE provided

Skip the interview: extract the process from the documents, build the full draft in one pass, then offer a short Grill pass over the riskiest gaps ("I found 3 places the documents don't specify what happens on failure — want to resolve them now?").
