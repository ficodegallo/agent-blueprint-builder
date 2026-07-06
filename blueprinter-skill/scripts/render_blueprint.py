#!/usr/bin/env python3
"""Validate a blueprint JSON file and render it as a self-contained shareable HTML page.

Usage:
    python3 render_blueprint.py <blueprint.json> [-o output.html] [--check]

Input format: the Agent Blueprint Builder export format —
    {"version": "1.0", "exportedAt": "...", "blueprint": {...}}
or a bare blueprint object. See references/ontology.md for the schema.

Exit codes: 0 = rendered (warnings allowed), 1 = validation errors, 2 = bad input.
"""

import argparse
import html
import json
import sys
from pathlib import Path

# ── Node type styling (matches the Agent Blueprint Builder canvas palette) ──

NODE_STYLES = {
    "trigger": {"color": "#10b981", "bg": "#ecfdf5", "label": "Trigger"},
    "work": {"color": "#f97316", "bg": "#fff7ed", "label": "Work"},
    "decision": {"color": "#f59e0b", "bg": "#fffbeb", "label": "Decision"},
    "end": {"color": "#ef4444", "bg": "#fef2f2", "label": "End"},
    "workflow": {"color": "#a855f7", "bg": "#faf5ff", "label": "Workflow"},
    "orchestrator": {"color": "#6366f1", "bg": "#eef2ff", "label": "Orchestrator"},
    "agentLoop": {"color": "#06b6d4", "bg": "#ecfeff", "label": "Agent Loop"},
    "router": {"color": "#f43f5e", "bg": "#fff1f2", "label": "AI Router"},
    "parallel": {"color": "#14b8a6", "bg": "#f0fdfa", "label": "Parallel"},
    "evaluatorOptimizer": {"color": "#65a30d", "bg": "#f7fee7", "label": "Evaluator Loop"},
}

WORKER_STYLES = {
    "agent": {"color": "#f97316", "label": "AI Agent"},
    "automation": {"color": "#eab308", "label": "Automation"},
    "human": {"color": "#3b82f6", "label": "Human"},
}

VALID_NODE_TYPES = set(NODE_STYLES)

PATTERN_NOTES = {
    "orchestrator": "Orchestrator-workers: a manager agent decomposes work and delegates to a dynamic worker pool",
    "agentLoop": "Autonomous agent loop: one agent with skills/tools working to a stop condition",
    "router": "AI routing: model-driven classification into specialized paths",
    "parallel": "Parallelization: independent branches fan out and reconverge",
    "evaluatorOptimizer": "Evaluator-optimizer: generate, score against criteria, iterate until passing",
}


def esc(text):
    return html.escape(str(text if text is not None else ""))


# ── Loading ──────────────────────────────────────────────────────────────────


def load_blueprint(path):
    try:
        raw = json.loads(Path(path).read_text())
    except (OSError, json.JSONDecodeError) as e:
        print(f"ERROR: cannot read {path}: {e}", file=sys.stderr)
        sys.exit(2)
    bp = raw.get("blueprint", raw) if isinstance(raw, dict) else None
    if not isinstance(bp, dict):
        print("ERROR: input is not a blueprint object", file=sys.stderr)
        sys.exit(2)
    return bp


# ── Validation (mirrors the app's rules) ─────────────────────────────────────


def validate(bp):
    errors, warnings = [], []
    nodes = bp.get("nodes") or []
    edges = bp.get("edges") or []

    if not bp.get("title"):
        warnings.append(("W000", "Blueprint has no title"))

    node_ids = set()
    for n in nodes:
        nid, data = n.get("id"), n.get("data") or {}
        ntype = data.get("nodeType")
        if not nid:
            errors.append(("E900", "A node is missing an id"))
            continue
        if nid in node_ids:
            errors.append(("E901", f"Duplicate node id: {nid}"))
        node_ids.add(nid)
        if ntype not in VALID_NODE_TYPES:
            errors.append(("E902", f'Node "{nid}" has unknown nodeType "{ntype}"'))
            continue
        name = data.get("name") or nid
        if not data.get("name"):
            warnings.append(("W001", f'Node "{nid}" is missing a name'))
        if ntype == "work":
            if not data.get("goal"):
                errors.append(("E004", f'"{name}" is missing a goal'))
            if not data.get("inputs"):
                warnings.append(("W002", f'"{name}" has no inputs defined'))
            if not data.get("tasks"):
                warnings.append(("W003", f'"{name}" has no tasks defined'))
        if ntype == "decision" and len(data.get("conditions") or []) < 2:
            warnings.append(("W004", f'Decision "{name}" has fewer than 2 branches'))
        if ntype == "orchestrator":
            if not data.get("terminationCondition"):
                errors.append(("E006", f'Orchestrator "{name}" has no termination condition'))
            if not data.get("workers"):
                warnings.append(("W010", f'Orchestrator "{name}" has no workers defined'))
        if ntype == "agentLoop" and not data.get("stopCondition"):
            errors.append(("E007", f'Agent loop "{name}" has no stop condition'))
        if ntype == "router" and len(data.get("routes") or []) < 2:
            warnings.append(("W007", f'Router "{name}" has fewer than 2 routes'))
        if ntype == "evaluatorOptimizer" and not data.get("evaluatorCriteria"):
            warnings.append(("W008", f'Evaluator loop "{name}" has no evaluator criteria'))

    for e in edges:
        if e.get("source") not in node_ids:
            errors.append(("E903", f"Edge references unknown source: {e.get('source')}"))
        if e.get("target") not in node_ids:
            errors.append(("E904", f"Edge references unknown target: {e.get('target')}"))

    types = [(n.get("data") or {}).get("nodeType") for n in nodes]
    if "trigger" not in types:
        errors.append(("E001", "Blueprint must have at least one Trigger node"))
    if "end" not in types:
        errors.append(("E002", "Blueprint must have at least one End node"))

    incoming = {n: 0 for n in node_ids}
    outgoing = {n: 0 for n in node_ids}
    for e in edges:
        if e.get("source") in outgoing:
            outgoing[e["source"]] += 1
        if e.get("target") in incoming:
            incoming[e["target"]] += 1
    for n in nodes:
        nid, data = n.get("id"), n.get("data") or {}
        ntype, name = data.get("nodeType"), data.get("name") or n.get("id")
        if nid not in node_ids or ntype not in VALID_NODE_TYPES:
            continue
        if ntype != "trigger" and incoming.get(nid, 0) == 0:
            errors.append(("E003", f'"{name}" has no incoming connections'))
        if ntype != "end" and outgoing.get(nid, 0) == 0:
            errors.append(("E003", f'"{name}" has no outgoing connections'))

    splits = [n for n in nodes if (n.get("data") or {}).get("nodeType") == "parallel" and (n.get("data") or {}).get("mode") == "split"]
    joins = [n for n in nodes if (n.get("data") or {}).get("nodeType") == "parallel" and (n.get("data") or {}).get("mode") == "join"]
    if splits and not joins:
        warnings.append(("W009", "Parallel split with no parallel join — branches never converge"))

    return errors, warnings


# ── Layout: BFS layers left→right ────────────────────────────────────────────

NODE_W, NODE_H, H_GAP, V_GAP, MARGIN = 240, 96, 110, 46, 40


def layout(nodes, edges):
    ids = [n["id"] for n in nodes]
    out_adj = {i: [] for i in ids}
    in_deg = {i: 0 for i in ids}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s in out_adj and t in in_deg:
            out_adj[s].append(t)
            in_deg[t] += 1

    by_id = {n["id"]: n for n in nodes}
    roots = [i for i in ids if (by_id[i].get("data") or {}).get("nodeType") == "trigger"] or [
        i for i in ids if in_deg[i] == 0
    ] or ids[:1]

    layer = {}
    frontier = [(r, 0) for r in roots]
    seen = set()
    guard = 0
    while frontier and guard < len(ids) * len(ids) + 10:
        guard += 1
        nid, depth = frontier.pop(0)
        if nid in seen and depth <= layer.get(nid, -1):
            continue
        layer[nid] = max(layer.get(nid, 0), depth)
        seen.add(nid)
        for nxt in out_adj[nid]:
            if layer.get(nxt, -1) < depth + 1 and guard < len(ids) * len(ids):
                frontier.append((nxt, depth + 1))

    max_layer = max(layer.values(), default=0)
    for i in ids:
        if i not in layer:
            max_layer += 0  # disconnected nodes go one past the deepest layer
            layer[i] = max(layer.values(), default=0) + 1

    columns = {}
    for i in ids:
        columns.setdefault(layer[i], []).append(i)

    pos = {}
    tallest = max(len(c) for c in columns.values())
    for depth in sorted(columns):
        col = columns[depth]
        col_h = len(col) * NODE_H + (len(col) - 1) * V_GAP
        total_h = tallest * NODE_H + (tallest - 1) * V_GAP
        y0 = MARGIN + (total_h - col_h) / 2
        for row, nid in enumerate(col):
            pos[nid] = (MARGIN + depth * (NODE_W + H_GAP), y0 + row * (NODE_H + V_GAP))

    width = MARGIN * 2 + (max(columns) + 1) * NODE_W + max(columns) * H_GAP
    height = MARGIN * 2 + tallest * NODE_H + (tallest - 1) * V_GAP
    return pos, width, height


# ── Helpers for node content ─────────────────────────────────────────────────


def node_subtitle(data):
    t = data.get("nodeType")
    if t == "work":
        return WORKER_STYLES.get(data.get("workerType"), {}).get("label", "Work")
    if t == "trigger":
        return f"Trigger · {data.get('triggerType', 'event')}"
    if t == "parallel":
        return "Parallel Join" if data.get("mode") == "join" else "Parallel Split"
    return NODE_STYLES[t]["label"]


def node_summary(data):
    t = data.get("nodeType")
    return {
        "trigger": data.get("description"),
        "work": data.get("goal"),
        "decision": data.get("description"),
        "end": data.get("outcome") or data.get("description"),
        "workflow": data.get("description"),
        "orchestrator": data.get("goal"),
        "agentLoop": data.get("goal"),
        "router": data.get("description"),
        "parallel": data.get("description"),
        "evaluatorOptimizer": data.get("goal"),
    }.get(t) or ""


def node_style(data):
    t = data.get("nodeType")
    style = dict(NODE_STYLES.get(t, NODE_STYLES["work"]))
    if t == "work":
        style["color"] = WORKER_STYLES.get(data.get("workerType"), {}).get("color", style["color"])
    return style


def branch_labels(data):
    """sourceHandle id -> label, for decision/router/parallel-split edges."""
    t = data.get("nodeType")
    items = {"decision": data.get("conditions"), "router": data.get("routes"), "parallel": data.get("branches")}.get(t) or []
    return {i.get("id"): i.get("label") for i in items if isinstance(i, dict)}


def wrap(text, chars):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        if cur and len(cur) + len(w) + 1 > chars:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


# ── SVG diagram ──────────────────────────────────────────────────────────────


def render_svg(nodes, edges, pos, width, height):
    by_id = {n["id"]: n for n in nodes}
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" font-family="system-ui, sans-serif">'
    ]
    parts.append(
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        'markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>'
    )

    # Edges under nodes
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s not in pos or t not in pos:
            continue
        sx, sy = pos[s][0] + NODE_W, pos[s][1] + NODE_H / 2
        tx, ty = pos[t][0], pos[t][1] + NODE_H / 2
        if tx <= sx:  # back-edge (loop) — route underneath
            midy = max(sy, ty) + NODE_H
            path = f"M {sx - NODE_W / 2} {sy + NODE_H / 2} C {sx - NODE_W / 2} {midy}, {tx + NODE_W / 2} {midy}, {tx + NODE_W / 2} {ty + NODE_H / 2}"
        else:
            dx = max((tx - sx) / 2, 36)
            path = f"M {sx} {sy} C {sx + dx} {sy}, {tx - dx} {ty}, {tx} {ty}"
        parts.append(f'<path d="{path}" fill="none" stroke="#94a3b8" stroke-width="1.6" marker-end="url(#arrow)"/>')

        label = (e.get("data") or {}).get("conditionLabel") or e.get("label") or ""
        if not label and s in by_id:
            label = branch_labels(by_id[s].get("data") or {}).get(e.get("sourceHandle"), "")
        if label:
            lx, ly = (sx + tx) / 2, (sy + ty) / 2 - 7
            w = len(str(label)) * 6.4 + 12
            parts.append(
                f'<rect x="{lx - w / 2}" y="{ly - 11}" width="{w}" height="17" rx="8" fill="#ffffff" stroke="#cbd5e1"/>'
                f'<text x="{lx}" y="{ly + 1}" text-anchor="middle" font-size="10.5" fill="#475569">{esc(label)}</text>'
            )

    # Nodes
    for n in nodes:
        nid = n["id"]
        if nid not in pos:
            continue
        x, y = pos[nid]
        data = n.get("data") or {}
        style = node_style(data)
        parts.append(
            f'<g><rect x="{x}" y="{y}" width="{NODE_W}" height="{NODE_H}" rx="10" fill="{style["bg"]}" '
            f'stroke="{style["color"]}" stroke-width="2"/>'
            f'<rect x="{x}" y="{y}" width="{NODE_W}" height="5" rx="2.5" fill="{style["color"]}"/>'
        )
        parts.append(
            f'<text x="{x + 12}" y="{y + 24}" font-size="9.5" font-weight="700" fill="{style["color"]}" '
            f'letter-spacing="0.6">{esc(node_subtitle(data).upper())}</text>'
        )
        name_lines = wrap(data.get("name") or nid, 32)[:2]
        for i, line in enumerate(name_lines):
            parts.append(f'<text x="{x + 12}" y="{y + 42 + i * 15}" font-size="12.5" font-weight="600" fill="#1e293b">{esc(line)}</text>')
        desc_y = y + 42 + len(name_lines) * 15 + 2
        for i, line in enumerate(wrap(node_summary(data), 40)[: 2 if len(name_lines) == 1 else 1]):
            parts.append(f'<text x="{x + 12}" y="{desc_y + i * 13}" font-size="10.5" fill="#64748b">{esc(line)}</text>')

        hitl = data.get("hitl") or {}
        if hitl.get("mode") and hitl["mode"] != "none":
            badge = {"approval": "⛔ Approval required", "sampled": "◔ Sampled review", "notify": "🔔 Notify human"}[hitl["mode"]]
            parts.append(f'<text x="{x + 12}" y="{y + NODE_H - 9}" font-size="9.5" fill="#b91c1c">{esc(badge)}</text>')
        parts.append("</g>")

    parts.append("</svg>")
    return "".join(parts)


# ── Detail card content per node type ────────────────────────────────────────


def field_rows(pairs):
    rows = "".join(
        f'<tr><td class="k">{esc(k)}</td><td>{v}</td></tr>' for k, v in pairs if v
    )
    return f'<table class="fields">{rows}</table>' if rows else ""


def fmt_io(items):
    if not items:
        return ""
    return ", ".join(f'{esc(i.get("name"))}{"" if i.get("required") else " <span class=opt>(optional)</span>"}' for i in items)


def fmt_list(items):
    if not items:
        return ""
    return "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def fmt_integrations(items):
    out = []
    for ig in items or []:
        if isinstance(ig, str):
            out.append(esc(ig))
        elif isinstance(ig, dict):
            name = esc(ig.get("name"))
            action = esc(ig.get("action"))
            eps = "".join(
                f'<div class="ep"><code>{esc(ep.get("method", "GET"))} {esc(ep.get("url"))}</code></div>'
                for ep in ig.get("apiEndpoints") or []
            )
            out.append(f"<strong>{name}</strong>{' — ' + action if action else ''}{eps}")
    return "<br>".join(out)


def agent_spec_rows(data):
    hitl = data.get("hitl") or {}
    hitl_txt = ""
    if hitl.get("mode") and hitl["mode"] != "none":
        bits = [hitl["mode"].capitalize()]
        if hitl.get("reviewer"):
            bits.append(f'by {esc(hitl["reviewer"])}')
        if hitl.get("sla"):
            bits.append(f'SLA: {esc(hitl["sla"])}')
        if hitl.get("samplingRate"):
            bits.append(f'sampling {esc(hitl["samplingRate"])}')
        hitl_txt = " · ".join(bits)
        if hitl.get("escalationPath"):
            hitl_txt += f'<br><span class="opt">Escalation: {esc(hitl["escalationPath"])}</span>'
    return [
        ("Agent description", esc(data.get("description"))),
        ("Skills", fmt_list(data.get("skills"))),
        ("Tools", fmt_list(data.get("tools"))),
        ("Autonomy level", esc(data.get("autonomyLevel"))),
        ("Guardrails", fmt_list(data.get("guardrails"))),
        ("Success criteria", fmt_list(data.get("successCriteria"))),
        ("Stop condition", esc(data.get("stopCondition"))),
        ("Failure handling", esc(data.get("failureHandling"))),
        ("Human oversight", hitl_txt),
    ]


def detail_rows(data):
    t = data.get("nodeType")
    rows = []
    if t == "trigger":
        rows = [("Type", esc(data.get("triggerType"))), ("Description", esc(data.get("description"))), ("Configuration", esc(data.get("configuration")))]
    elif t == "work":
        rows = [
            ("Worker type", esc(WORKER_STYLES.get(data.get("workerType"), {}).get("label", data.get("workerType")))),
            ("Goal", esc(data.get("goal"))),
            ("Inputs", fmt_io(data.get("inputs"))),
            ("Tasks", fmt_list(data.get("tasks"))),
            ("Outputs", fmt_io(data.get("outputs"))),
            ("Integrations", fmt_integrations(data.get("integrations"))),
        ] + agent_spec_rows(data)
    elif t == "decision":
        rows = [("Description", esc(data.get("description")))]
        for c in data.get("conditions") or []:
            rows.append((f'Branch: {c.get("label", "?")}', esc(c.get("description")) or "—"))
    elif t == "router":
        rows = [("Description", esc(data.get("description"))), ("Classifier instructions", esc(data.get("classifierInstructions")))]
        for r in data.get("routes") or []:
            rows.append((f'Route: {r.get("label", "?")}', esc(r.get("description")) or "—"))
        rows.append(("Fallback route", esc(data.get("fallbackRoute"))))
    elif t == "parallel":
        rows = [("Mode", "Join (fan-in)" if data.get("mode") == "join" else "Split (fan-out)"), ("Description", esc(data.get("description")))]
        if data.get("mode") == "split":
            for b in data.get("branches") or []:
                rows.append((f'Branch: {b.get("label", "?")}', esc(b.get("description")) or "—"))
        else:
            rows.append(("Join behavior", esc(data.get("joinBehavior"))))
    elif t == "orchestrator":
        rows = [
            ("Goal", esc(data.get("goal"))),
            ("Delegation strategy", esc(data.get("delegationStrategy"))),
        ]
        for w in data.get("workers") or []:
            skills = f' <span class="opt">[{esc(", ".join(w.get("skills") or []))}]</span>' if w.get("skills") else ""
            rows.append((f'Worker: {w.get("name", "?")}', f'{esc(w.get("description"))}{skills}'))
        rows += [
            ("Synthesis", esc(data.get("synthesis"))),
            ("Termination condition", esc(data.get("terminationCondition"))),
            ("Max iterations", esc(data.get("maxIterations"))),
            ("Budget", esc(data.get("budget"))),
            ("Inputs", fmt_io(data.get("inputs"))),
            ("Outputs", fmt_io(data.get("outputs"))),
        ] + agent_spec_rows(data)
    elif t == "agentLoop":
        rows = [
            ("Goal", esc(data.get("goal"))),
            ("Max iterations", esc(data.get("maxIterations"))),
            ("Memory", esc(data.get("memory"))),
            ("Inputs", fmt_io(data.get("inputs"))),
            ("Outputs", fmt_io(data.get("outputs"))),
            ("Integrations", fmt_integrations(data.get("integrations"))),
        ] + agent_spec_rows(data)
    elif t == "evaluatorOptimizer":
        rows = [
            ("Goal", esc(data.get("goal"))),
            ("Generator", esc(data.get("generatorDescription"))),
            ("Evaluator criteria", fmt_list(data.get("evaluatorCriteria"))),
            ("Pass condition", esc(data.get("passCondition"))),
            ("Max iterations", esc(data.get("maxIterations"))),
            ("On max iterations", esc(data.get("onMaxIterations"))),
            ("Inputs", fmt_io(data.get("inputs"))),
            ("Outputs", fmt_io(data.get("outputs"))),
        ] + agent_spec_rows(data)
    elif t == "workflow":
        rows = [
            ("Workflow", esc(data.get("workflowName"))),
            ("Version", esc(data.get("version"))),
            ("Description", esc(data.get("description"))),
            ("Inputs", fmt_io(data.get("inputs"))),
            ("Outputs", fmt_io(data.get("outputs"))),
        ]
    elif t == "end":
        rows = [("Description", esc(data.get("description"))), ("Outcome", esc(data.get("outcome")))]
    if data.get("ai_notes"):
        rows.append(("AI notes", f'<span class="opt">{esc(data.get("ai_notes"))} (confidence: {esc(data.get("ai_confidence") or "?")})</span>'))
    return rows


# ── HTML page ────────────────────────────────────────────────────────────────

CSS = """
:root { --ink:#1e293b; --muted:#64748b; --line:#e2e8f0; }
* { box-sizing:border-box; }
body { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; margin:0; color:var(--ink); background:#f8fafc; }
.page { max-width:1080px; margin:0 auto; padding:32px 24px 64px; }
header.bp h1 { margin:0 0 6px; font-size:26px; }
header.bp .desc { color:var(--muted); font-size:15px; max-width:760px; }
.meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.chip { background:#fff; border:1px solid var(--line); border-radius:999px; padding:3px 12px; font-size:12px; color:var(--muted); }
.chip b { color:var(--ink); font-weight:600; }
h2 { font-size:17px; margin:36px 0 12px; padding-bottom:6px; border-bottom:2px solid var(--line); }
.patterns li { font-size:13.5px; color:var(--muted); margin:3px 0; }
.diagram-wrap { background:#fff; border:1px solid var(--line); border-radius:12px; overflow:auto; position:relative; }
.diagram-inner { transform-origin: top left; }
.zoom { position:sticky; top:8px; float:right; margin:8px; z-index:2; }
.zoom button { border:1px solid var(--line); background:#fff; border-radius:8px; width:30px; height:30px; font-size:15px; cursor:pointer; margin-left:4px; }
.legend { display:flex; flex-wrap:wrap; gap:10px; margin:10px 0 0; font-size:12px; color:var(--muted); }
.legend span { display:inline-flex; align-items:center; gap:5px; }
.dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
.valid { border-radius:10px; padding:12px 16px; font-size:13.5px; }
.valid.ok { background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; }
.valid.bad { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
.valid ul { margin:6px 0 0; padding-left:18px; }
.valid .warn { color:#92400e; }
.card { background:#fff; border:1px solid var(--line); border-left-width:5px; border-radius:10px; padding:14px 18px; margin:12px 0; }
.card h3 { margin:0; font-size:15px; display:flex; align-items:center; gap:8px; }
.card .tag { font-size:10px; font-weight:700; letter-spacing:.6px; padding:2px 8px; border-radius:999px; color:#fff; }
table.fields { width:100%; border-collapse:collapse; margin-top:10px; font-size:13px; }
table.fields td { padding:5px 8px; vertical-align:top; border-top:1px solid #f1f5f9; }
table.fields td.k { width:180px; color:var(--muted); font-weight:600; white-space:nowrap; }
table.fields ul { margin:0; padding-left:16px; }
.opt { color:#94a3b8; font-size:12px; }
.ep code { font-size:11.5px; background:#f1f5f9; border-radius:4px; padding:1px 6px; }
table.conn { width:100%; border-collapse:collapse; font-size:13px; background:#fff; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
table.conn th { text-align:left; background:#f1f5f9; padding:7px 10px; font-size:12px; }
table.conn td { padding:6px 10px; border-top:1px solid #f1f5f9; }
footer { margin-top:40px; font-size:12px; color:#94a3b8; }
@media print { .zoom { display:none; } .diagram-wrap { overflow:visible; } body { background:#fff; } }
"""

ZOOM_JS = """
(function(){var s=1,el=document.querySelector('.diagram-inner');
document.getElementById('zin').onclick=function(){s=Math.min(s+0.15,2.5);el.style.transform='scale('+s+')';};
document.getElementById('zout').onclick=function(){s=Math.max(s-0.15,0.3);el.style.transform='scale('+s+')';};})();
"""


def render_html(bp, errors, warnings):
    nodes = bp.get("nodes") or []
    edges = bp.get("edges") or []
    pos, width, height = layout(nodes, edges) if nodes else ({}, 400, 200)
    svg = render_svg(nodes, edges, pos, width, height)
    by_id = {n["id"]: n for n in nodes}

    # BFS-ish ordering for cards: by layout x then y
    ordered = sorted(nodes, key=lambda n: (pos.get(n["id"], (9e9, 9e9))))

    types_present = {(n.get("data") or {}).get("nodeType") for n in nodes}
    pattern_items = [PATTERN_NOTES[t] for t in ["orchestrator", "agentLoop", "router", "parallel", "evaluatorOptimizer"] if t in types_present]
    if not pattern_items:
        pattern_items = ["Deterministic pipeline: fixed, reviewable steps chained in sequence"]

    legend = "".join(
        f'<span><i class="dot" style="background:{NODE_STYLES[t]["color"]}"></i>{NODE_STYLES[t]["label"]}</span>'
        for t in ["trigger", "work", "decision", "router", "parallel", "orchestrator", "agentLoop", "evaluatorOptimizer", "workflow", "end"]
        if t in types_present
    )

    if errors:
        vitems = "".join(f"<li><b>{c}</b> {esc(m)}</li>" for c, m in errors)
        vitems += "".join(f'<li class="warn"><b>{c}</b> {esc(m)}</li>' for c, m in warnings)
        valid_html = f'<div class="valid bad"><b>{len(errors)} error(s), {len(warnings)} warning(s)</b><ul>{vitems}</ul></div>'
    elif warnings:
        vitems = "".join(f'<li class="warn"><b>{c}</b> {esc(m)}</li>' for c, m in warnings)
        valid_html = f'<div class="valid ok"><b>Structurally valid</b> — {len(warnings)} warning(s)<ul>{vitems}</ul></div>'
    else:
        valid_html = '<div class="valid ok"><b>Structurally valid</b> — no issues found.</div>'

    cards = []
    for i, n in enumerate(ordered, 1):
        data = n.get("data") or {}
        style = node_style(data)
        cards.append(
            f'<div class="card" style="border-left-color:{style["color"]}" id="node-{esc(n["id"])}">'
            f'<h3><span class="tag" style="background:{style["color"]}">{esc(node_subtitle(data).upper())}</span>'
            f'{i}. {esc(data.get("name") or n["id"])}</h3>'
            f'{field_rows(detail_rows(data))}</div>'
        )

    conn_rows = []
    for e in edges:
        s, t = by_id.get(e.get("source")), by_id.get(e.get("target"))
        label = (e.get("data") or {}).get("conditionLabel") or e.get("label") or ""
        if not label and s:
            label = branch_labels(s.get("data") or {}).get(e.get("sourceHandle"), "")
        conn_rows.append(
            f'<tr><td>{esc((s or {}).get("data", {}).get("name") or e.get("source"))}</td>'
            f'<td>{esc((t or {}).get("data", {}).get("name") or e.get("target"))}</td>'
            f'<td>{esc(label) or "—"}</td></tr>'
        )

    meta_chips = []
    for label, key in [("Version", "version"), ("Status", "status"), ("Client", "clientName"), ("Project", "projectName"), ("Owner", "createdBy"), ("Last modified", "lastModifiedDate")]:
        if bp.get(key):
            meta_chips.append(f'<span class="chip">{label}: <b>{esc(bp[key])}</b></span>')
    meta_chips.append(f'<span class="chip">Nodes: <b>{len(nodes)}</b></span>')
    meta_chips.append(f'<span class="chip">Connections: <b>{len(edges)}</b></span>')

    extra_meta = ""
    for label, key in [("Impacted audiences", "impactedAudiences"), ("Business benefits", "businessBenefits"), ("Key contacts", "clientContacts")]:
        if bp.get(key):
            extra_meta += f"<h2>{label}</h2>{fmt_list(bp[key])}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(bp.get("title") or "Blueprint")} — Agent Blueprint</title>
<style>{CSS}</style>
</head>
<body>
<div class="page">
<header class="bp">
  <h1>{esc(bp.get("title") or "Untitled Blueprint")}</h1>
  <div class="desc">{esc(bp.get("description"))}</div>
  <div class="meta">{"".join(meta_chips)}</div>
</header>

<h2>Agentic patterns used</h2>
<ul class="patterns">{"".join(f"<li>{esc(p)}</li>" for p in pattern_items)}</ul>

<h2>Process flow</h2>
<div class="diagram-wrap">
  <div class="zoom"><button id="zout" title="Zoom out">−</button><button id="zin" title="Zoom in">+</button></div>
  <div class="diagram-inner">{svg}</div>
</div>
<div class="legend">{legend}</div>

<h2>Validation</h2>
{valid_html}

<h2>Node specifications</h2>
{"".join(cards)}

<h2>Connections</h2>
<table class="conn"><tr><th>From</th><th>To</th><th>Condition</th></tr>{"".join(conn_rows)}</table>
{extra_meta}

<footer>Generated by the blueprinter skill · The companion .blueprint.json can be imported into the Agent Blueprint Builder app (Import button) for interactive editing.</footer>
</div>
<script>{ZOOM_JS}</script>
</body>
</html>"""


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", help="blueprint JSON file")
    ap.add_argument("-o", "--output", help="output HTML path (default: alongside input)")
    ap.add_argument("--check", action="store_true", help="validate only, no HTML output")
    args = ap.parse_args()

    bp = load_blueprint(args.input)
    errors, warnings = validate(bp)

    for code, msg in errors:
        print(f"ERROR   {code}: {msg}")
    for code, msg in warnings:
        print(f"WARNING {code}: {msg}")
    if not errors and not warnings:
        print("Validation: clean")

    if args.check:
        sys.exit(1 if errors else 0)

    out = Path(args.output) if args.output else Path(args.input).with_suffix(".html")
    out.write_text(render_html(bp, errors, warnings))
    print(f"Wrote {out} ({len(bp.get('nodes') or [])} nodes, {len(bp.get('edges') or [])} edges)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
