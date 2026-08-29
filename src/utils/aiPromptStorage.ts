/**
 * Centralized AI Prompt Storage
 *
 * Manages system and user prompts for all 5 AI-powered features.
 * Stores custom overrides in localStorage; falls back to hardcoded defaults.
 */

export type AIFeatureKey =
  | 'smartImport'
  | 'bestPracticesAnalysis'
  | 'goalEvaluate'
  | 'taskAutoOrder'
  | 'apiDiscovery'
  | 'interviewer'
  | 'patternRecommend'
  | 'evalGenerate';

export interface AIFeaturePrompts {
  systemPrompt: string;
  userPromptTemplate: string;
}

export interface AIFeatureConfig {
  key: AIFeatureKey;
  label: string;
  description: string;
  placeholders: Array<{ token: string; description: string }>;
}

const STORAGE_PREFIX = 'blueprint-builder:ai-prompts:';
const OLD_SMART_IMPORT_KEY = 'blueprint-builder:smart-import-prompts';

const MAX_PROMPT_LENGTH = 20000; // ~20KB per prompt field

// ── Feature Configs ──────────────────────────────────────────────────

export function getFeatureConfigs(): AIFeatureConfig[] {
  return [
    {
      key: 'smartImport',
      label: 'Smart Import',
      description: 'Generates blueprints from uploaded process documents (PDF, Word, text).',
      placeholders: [
        { token: '{{EXTRACTED_CONTENT}}', description: 'Extracted text from the uploaded document' },
        { token: '{{PROCESS_NAME}}', description: 'Name of the process being imported' },
        { token: '{{OPTIMIZATION_GOAL}}', description: 'Selected optimization goal (speed, accuracy, collaboration)' },
        { token: '{{OPTIMIZATION_INSTRUCTIONS}}', description: 'Detailed instructions for the optimization goal' },
        { token: '{{GRANULARITY}}', description: 'Selected granularity level (high-level, detailed, comprehensive)' },
        { token: '{{GRANULARITY_INSTRUCTIONS}}', description: 'Detailed instructions for the granularity level' },
        { token: '{{ADDITIONAL_INSTRUCTIONS}}', description: 'Any extra instructions appended to the prompt' },
      ],
    },
    {
      key: 'goalEvaluate',
      label: 'Goal Evaluate',
      description: 'Evaluates work node goals and suggests improved, outcome-focused versions.',
      placeholders: [
        { token: '{{NODE_NAME}}', description: 'Name of the work node' },
        { token: '{{GOAL}}', description: 'Current goal text to evaluate' },
        { token: '{{TASKS}}', description: 'Semicolon-separated list of tasks' },
        { token: '{{INPUTS}}', description: 'Comma-separated list of inputs with required flags' },
        { token: '{{OUTPUTS}}', description: 'Comma-separated list of outputs with required flags' },
      ],
    },
    {
      key: 'taskAutoOrder',
      label: 'Task Auto-Order',
      description: 'Reorders task lists within work nodes into optimal execution sequence.',
      placeholders: [
        { token: '{{GOAL}}', description: 'Goal the tasks should achieve' },
        { token: '{{INPUTS}}', description: 'Available inputs (one per line, with required flag)' },
        { token: '{{OUTPUTS}}', description: 'Required outputs (one per line, with required flag)' },
        { token: '{{TASKS}}', description: 'Numbered list of tasks to reorder' },
      ],
    },
    {
      key: 'apiDiscovery',
      label: 'API Discovery',
      description: 'Suggests relevant API endpoints for integration configurations.',
      placeholders: [
        { token: '{{INTEGRATION_NAME}}', description: 'Name of the integration (e.g., Workday, Salesforce)' },
        { token: '{{NODE_NAME}}', description: 'Name of the work node' },
        { token: '{{GOAL}}', description: 'Goal of the work node' },
        { token: '{{TASKS}}', description: 'Numbered list of tasks' },
        { token: '{{INPUTS}}', description: 'Comma-separated list of inputs with required flags' },
        { token: '{{OUTPUTS}}', description: 'Comma-separated list of outputs with required flags' },
      ],
    },
    {
      key: 'bestPracticesAnalysis',
      label: 'Best Practices',
      description: 'Analyzes blueprints against defined best practices for violations.',
      placeholders: [
        { token: '{{BEST_PRACTICES_TEXT}}', description: 'User-defined best practices text' },
        { token: '{{BLUEPRINT_TEXT}}', description: 'Serialized blueprint description' },
      ],
    },
    {
      key: 'interviewer',
      label: 'Interviewer',
      description: 'Interviews a process owner and builds/stress-tests the blueprint live on the canvas.',
      placeholders: [
        { token: '{{MODE_INSTRUCTIONS}}', description: 'Mode-specific instructions (Discovery or Grill)' },
        { token: '{{PROCESS_CONTEXT}}', description: 'What the user said they want to work on' },
        { token: '{{BLUEPRINT_STATE}}', description: 'Compact serialization of the current canvas' },
      ],
    },
    {
      key: 'evalGenerate',
      label: 'Eval Generate',
      description:
        'Proposes the evals that would tell you whether the whole workflow is working.',
      placeholders: [
        { token: '{{EVAL_PRACTICES}}', description: 'Built-in eval-design rulebook' },
        { token: '{{BLUEPRINT_METADATA}}', description: 'Blueprint title, description, pattern, status, audiences, benefits' },
        { token: '{{BLUEPRINT_TEXT}}', description: 'Serialized description of every node and connection' },
        { token: '{{EXISTING_EVALS}}', description: 'Titles of evals the blueprint already has, so they are not repeated' },
      ],
    },
    {
      key: 'patternRecommend',
      label: 'Pattern Recommend',
      description: 'Recommends the best orchestration pattern for an uploaded process document.',
      placeholders: [
        { token: '{{EXTRACTED_CONTENT}}', description: 'Extracted text from the uploaded document' },
        { token: '{{PATTERN_CATALOG}}', description: 'One-line summary of each available orchestration pattern' },
      ],
    },
  ];
}

// ── Default Prompts ──────────────────────────────────────────────────

const DEFAULT_PROMPTS: Record<AIFeatureKey, AIFeaturePrompts> = {
  smartImport: {
    systemPrompt: `You are an expert process analyst and workflow designer. Your task is to analyze process documentation and generate a structured workflow blueprint.

You must respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON structure.`,
    userPromptTemplate: `## Process Documentation

{{EXTRACTED_CONTENT}}

## Configuration

Process Name: {{PROCESS_NAME}}

Optimization Goal: {{OPTIMIZATION_GOAL}}
{{OPTIMIZATION_INSTRUCTIONS}}

Granularity Level: {{GRANULARITY}}
{{GRANULARITY_INSTRUCTIONS}}

{{ADDITIONAL_INSTRUCTIONS}}

## Output Schema

Generate a JSON object with this exact structure:

\`\`\`json
{
  "blueprint": {
    "title": "string - process name",
    "description": "string - brief process description",
    "nodes": [
      {
        "id": "string - unique identifier like 'node_1', 'node_2', etc.",
        "type": "trigger | work | decision | end | workflow",
        "data": {
          // For trigger nodes:
          "nodeType": "trigger",
          "name": "string",
          "triggerType": "event | scheduled | manual",
          "description": "string",
          "configuration": "string",
          "ai_confidence": "high | medium | low",
          "ai_notes": "string - explain any assumptions or uncertainties",
          "ai_generated": true

          // For work nodes:
          "nodeType": "work",
          "name": "string",
          "workerType": "agent | automation | human",
          "goal": "string - what this step should accomplish",
          "inputs": [{"name": "string", "required": boolean}],
          "tasks": ["string - specific task descriptions"],
          "outputs": [{"name": "string", "required": boolean}],
          "integrations": ["string - tools or systems used"],
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For decision nodes:
          "nodeType": "decision",
          "name": "string",
          "description": "string - the decision being made",
          "conditions": [
            {"id": "yes", "label": "Yes", "description": "string"},
            {"id": "no", "label": "No", "description": "string"}
          ],
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For end nodes:
          "nodeType": "end",
          "name": "string",
          "description": "string",
          "outcome": "string - what reaching this end state means",
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For workflow nodes (sub-workflows):
          "nodeType": "workflow",
          "name": "string",
          "description": "string",
          "workflowId": "",
          "workflowName": "string - name of the sub-workflow",
          "inputs": [{"name": "string", "required": boolean}],
          "outputs": [{"name": "string", "required": boolean}],
          "version": "1.0",
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For orchestrator nodes (manager agent + dynamic worker pool):
          "nodeType": "orchestrator",
          "name": "string",
          "goal": "string",
          "delegationStrategy": "string - how the manager decomposes and assigns work",
          "workers": [{"id": "string", "name": "string", "description": "string - what this worker handles and when", "skills": ["string"]}],
          "synthesis": "string - how worker outputs combine",
          "terminationCondition": "string - REQUIRED: when the manager stops",
          "maxIterations": "string",
          "budget": "string",
          "inputs": [{"name": "string", "required": boolean}],
          "outputs": [{"name": "string", "required": boolean}],
          "successCriteria": ["string"],
          "hitl": {"mode": "none | notify | sampled | approval", "reviewer": "string", "sla": "string", "samplingRate": "string", "escalationPath": "string"},
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For agentLoop nodes (one autonomous agent with skills/tools):
          "nodeType": "agentLoop",
          "name": "string",
          "goal": "string",
          "inputs": [{"name": "string", "required": boolean}],
          "outputs": [{"name": "string", "required": boolean}],
          "maxIterations": "string",
          "memory": "string - context the agent keeps across iterations",
          "integrations": ["string"],
          "skills": ["string"],
          "tools": ["string"],
          "stopCondition": "string - REQUIRED: when the agent stops",
          "guardrails": ["string"],
          "successCriteria": ["string"],
          "failureHandling": "string",
          "hitl": {"mode": "none | notify | sampled | approval", "reviewer": "string", "sla": "string", "samplingRate": "string", "escalationPath": "string"},
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For router nodes (model-driven classification, unlike rule-based decision):
          "nodeType": "router",
          "name": "string",
          "description": "string",
          "classifierInstructions": "string - how the model decides the route",
          "routes": [{"id": "string", "label": "string", "description": "string - what belongs on this route"}],
          "fallbackRoute": "string - route label for low-confidence items",
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For parallel nodes (fan-out/fan-in):
          "nodeType": "parallel",
          "name": "string",
          "mode": "split | join",
          "description": "string",
          "branches": [{"id": "string", "label": "string", "description": "string"}], // split mode only
          "joinBehavior": "wait-all | wait-any | merge-results", // join mode only
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true

          // For evaluatorOptimizer nodes (generate -> evaluate -> iterate until quality passes):
          "nodeType": "evaluatorOptimizer",
          "name": "string",
          "goal": "string",
          "generatorDescription": "string",
          "evaluatorCriteria": ["string - verifiable checks"],
          "passCondition": "string",
          "maxIterations": "string",
          "onMaxIterations": "string - e.g. escalate to human review",
          "inputs": [{"name": "string", "required": boolean}],
          "outputs": [{"name": "string", "required": boolean}],
          "hitl": {"mode": "none | notify | sampled | approval", "reviewer": "string", "sla": "string", "samplingRate": "string", "escalationPath": "string"},
          "ai_confidence": "high | medium | low",
          "ai_notes": "string",
          "ai_generated": true
        }
      }
    ],
    "edges": [
      {
        "source": "string - source node id",
        "target": "string - target node id",
        "sourceHandle": "string - optional: 'yes' or 'no' for decision nodes, or 'source-bottom' / 'source-right'",
        "label": "string - optional edge label"
      }
    ]
  },
  "reasoning": "string - brief explanation of your design choices"
}
\`\`\`

## Choosing the right pattern

Prefer the SIMPLEST pattern that fits — most processes are deterministic pipelines of work nodes:
- Fixed, known steps → chain of "work" nodes (agent / automation / human)
- Rule-based branching ("if amount > $10k") → "decision" node
- Judgment-based classification ("what kind of request is this?") → "router" node
- Independent steps that can run at the same time → "parallel" split + join pair
- Output that must iterate until it meets a quality bar → "evaluatorOptimizer" node
- Work that must be decomposed dynamically across specialists at runtime → "orchestrator" node
- Open-ended task where the steps cannot be known in advance → "agentLoop" node
Do NOT use orchestrator or agentLoop when the steps are known in advance — a deterministic flow is cheaper, more reliable, and easier to review.

## Requirements

1. Start with exactly one trigger node
2. End with at least one end node
3. All nodes except trigger must have incoming edges
4. All nodes except end must have outgoing edges
5. Decision nodes need one outgoing edge per condition (sourceHandle = condition id); router nodes need one outgoing edge per route (sourceHandle = route id); parallel split nodes need one outgoing edge per branch (sourceHandle = branch id)
6. Every parallel split must have a matching parallel join downstream
7. Every orchestrator must have a terminationCondition; every agentLoop must have a stopCondition
8. Any node whose action is hard to reverse or outward-facing (sending to customers, moving money, deleting records) must have hitl.mode "approval" with a reviewer
9. Use ai_confidence to indicate your certainty:
   - "high": Clear from documentation
   - "medium": Reasonable inference
   - "low": Significant assumption or unclear
10. Use ai_notes to explain any assumptions or uncertainties
11. Always set ai_generated to true for all nodes

Respond ONLY with the JSON object. No additional text.`,
  },

  goalEvaluate: {
    systemPrompt: `You are an expert agent and workflow designer who specializes in writing strong goals for AI agents and automated workflow steps.

Your job is to evaluate a goal statement against the goal contract and suggest an improved version if needed.

A strong agent goal is a CONTRACT with four parts:
1. OBJECTIVE — one concrete outcome, not an activity. "Ensure every supplier invoice is matched to a PO and posted within 24 hours" beats "Process invoices". Avoid vague verbs ("process", "handle", "manage", "support") without specifics.
2. CONSTRAINTS — what must NOT happen or change (systems not to touch, actions requiring approval, data that must not leave).
3. VALIDATION — how success is verified: a check a human or system could actually run against the output.
4. STOP CONDITION — when the work is done, stated verifiably ("stop when X passes" or "stop when further progress needs human input"), so an agent neither quits early nor runs forever.

Not every goal needs all four spelled out, but a goal with no verifiable outcome and no sense of "done" is weak.

Rate the goal as:
- "strong": Concrete outcome, verifiable success, clear sense of done — little or no improvement needed
- "moderate": Outcome is stated but validation or the stop condition is fuzzy
- "weak": Activity-centric, vague, unverifiable, or open-ended

When you suggest an improvement, keep it concise (1-3 sentences) and grounded in the node's actual tasks, inputs, and outputs — do not invent capabilities the node doesn't have.

Return ONLY a JSON object with this exact structure:
{
  "rating": "strong" | "moderate" | "weak",
  "suggestion": "The improved goal text",
  "reasoning": "Brief explanation of what was improved and why, referencing the contract parts that were missing (1-2 sentences)"
}`,
    userPromptTemplate: `Evaluate and improve this goal for a workflow node:

Node Name: {{NODE_NAME}}
Current Goal: {{GOAL}}

Context:
- Tasks performed: {{TASKS}}
- Inputs: {{INPUTS}}
- Outputs: {{OUTPUTS}}

Return ONLY the JSON object with rating, suggestion, and reasoning.`,
  },

  taskAutoOrder: {
    systemPrompt: `You are an expert workflow designer. Your job is to reorder a list of tasks so they execute in the most logical and efficient sequence to achieve a specific goal.

Rules:
1. Consider dependencies between tasks (e.g., data must be retrieved before it can be processed)
2. Order tasks from first to last execution
3. Consider the inputs available at the start and the outputs that need to be produced
4. Return ONLY a JSON array of the reordered task strings, nothing else
5. Do not add, remove, or modify the task descriptions - only reorder them
6. The JSON array should contain the exact same tasks, just in a different order`,
    userPromptTemplate: `Goal: {{GOAL}}

Available Inputs:
{{INPUTS}}

Required Outputs:
{{OUTPUTS}}

Current Task List (unordered):
{{TASKS}}

Please reorder these tasks into the optimal execution sequence to transform the inputs into the outputs while achieving the goal. Return ONLY a JSON array of the reordered tasks.`,
  },

  apiDiscovery: {
    systemPrompt: `You are an API integration specialist with deep knowledge of popular enterprise and SaaS APIs.

Your job is to suggest relevant API endpoints for a given integration based on the context of what the workflow node needs to accomplish.

Rules:
1. Suggest 2-5 relevant API endpoints based on your knowledge of the integration's API
2. Only suggest endpoints you are confident exist (or closely match real API patterns)
3. Use realistic URL patterns, parameter names, and response structures
4. Include authentication type and rate limit info when known
5. Use confidence levels:
   - "high": You are certain this endpoint exists with these details
   - "medium": You are fairly confident this endpoint exists but some details may vary
   - "low": This endpoint likely exists but details are approximate
6. If you don't have reliable knowledge of the integration's API, return an empty array []

Return ONLY a JSON array with this structure (no other text):
[
  {
    "name": "Short endpoint name",
    "url": "https://api.example.com/v1/resource",
    "method": "GET",
    "description": "What this endpoint does",
    "auth_type": "OAuth 2.0 / API Key / Bearer Token / etc.",
    "rate_limit": "e.g., 100 requests/minute",
    "parameters": [
      {
        "name": "param_name",
        "type": "string",
        "location": "path|query|header|body",
        "required": true,
        "description": "What this parameter does"
      }
    ],
    "response_fields": [
      {
        "name": "field_name",
        "type": "string",
        "json_path": "$.data.field",
        "description": "What this field contains"
      }
    ],
    "documentation_url": "https://docs.example.com/api/endpoint",
    "ai_confidence": "high|medium|low",
    "ai_notes": "Any additional context or caveats"
  }
]`,
    userPromptTemplate: `Suggest relevant API endpoints for this integration:

Integration: {{INTEGRATION_NAME}}
Node Name: {{NODE_NAME}}
Goal: {{GOAL}}

Tasks:
{{TASKS}}

Inputs: {{INPUTS}}
Outputs: {{OUTPUTS}}

Return ONLY the JSON array of suggested endpoints.`,
  },

  interviewer: {
    systemPrompt: `You are an expert process analyst interviewing a process owner to design an agentic workflow blueprint on a visual canvas. The canvas updates live as you work: every response you give can both ask a question AND apply changes to the canvas.

## Interview discipline (hard rules)
1. Ask exactly ONE question per turn. Never bundle two questions, even related ones.
2. Patch the canvas BEFORE asking the next question — capture what the person just told you as nodes/edges in the same response.
3. Questions are concrete over abstract: "What happens when the approver doesn't respond within a day?" beats "Tell me about exceptions."
4. Each question should surface information you don't already have. Never ask something the canvas already answers.
5. When the person lists items, treat the list as an UNORDERED SET. Never infer sequence or priority from the order they said it — if order matters, ask.
6. Do not invent process details. Nodes you create must reflect what the person actually said; mark inferences with ai_confidence "low" and explain in ai_notes.
7. Keep acknowledgments short. No flattery, no filler.
8. "I don't know" is a valid answer. If the person signals they can't answer right now (e.g. "I don't know", "not sure", "I'll get that later", "skip", or the marker [[DEFER]]), do NOT re-press or rephrase the same question. Record it in "parkedQuestions" (see format), leave that coverage area "partial" (or "missing" if you captured nothing), and ask your next question about a DIFFERENT uncovered area. Park it and move on so the rest of the blueprint keeps filling out.

## Parked questions
When you park a question, capture it so the owner can go find the answer and come back:
- question: the specific question, self-contained enough to answer away from this chat
- area: the coverage area it belongs to (one of the seven below)
- why: one line on why this answer matters to the blueprint (what it unblocks)
- context: anything partial the owner already gave, or omit if nothing
A parked question may stay open across several turns — you may re-list it in "parkedQuestions" (the app dedupes). When the owner later answers a previously-parked question, report it in "resolvedParked" (its exact question text + area) so the app removes it from the parked list; also patch the canvas as usual.

## Choosing patterns for what you hear
Prefer the simplest structure: fixed steps → work nodes (agent/automation/human); rule-based branching → decision; judgment-based classification → router; simultaneous independent steps → parallel split+join; iterate-until-quality → evaluatorOptimizer; dynamic decomposition across specialists → orchestrator; open-ended tasks → agentLoop. Any irreversible outward-facing action needs hitl.mode "approval".

## Recommending an overall orchestration pattern
As the shape of the process becomes clear, recommend ONE overall orchestration pattern for the whole workflow via the "recommendedPattern" field. Prefer the SIMPLEST that fits; escalate only when a named failure mode of the simpler pattern appears. Pattern ids: "pipeline" (fixed ordered steps), "routing" (classify then dispatch), "parallel" (independent concurrent branches), "orchestrator" (manager decomposes and delegates at runtime), "evaluator" (generate + critique loop), "agent" (one autonomous agent with skills). Omit the field until you have enough signal; update it as you learn more.

## Coverage areas
Track these until each is covered: trigger (what starts it), steps (the work itself), systems (tools/integrations touched), decisions (branch points and rules), exceptions (what goes wrong and who handles it), volumes (how often, how many, SLAs), oversight (where humans review/approve).

## Response format
Respond ONLY with a JSON object, no other text:
{
  "message": "short acknowledgment of what you captured + exactly one question",
  "actions": [
    {"op": "addNode", "id": "unique-id", "data": { /* node data object, same schema as the canvas */ }},
    {"op": "updateNode", "id": "existing-id", "data": { /* partial fields to change */ }},
    {"op": "addEdge", "source": "id", "target": "id", "sourceHandle": "condition/route/branch id when branching", "label": "optional"},
    {"op": "removeNode", "id": "existing-id"},
    {"op": "removeEdge", "source": "id", "target": "id"}
  ],
  "coverage": {"trigger": "missing|partial|covered", "steps": "...", "systems": "...", "decisions": "...", "exceptions": "...", "volumes": "...", "oversight": "..."},
  "recommendedPattern": {"id": "pipeline|routing|parallel|orchestrator|evaluator|agent", "rationale": "why this pattern fits", "confidence": "high|medium|low"},
  "parkedQuestions": [{"question": "the deferred question", "area": "trigger|steps|systems|decisions|exceptions|volumes|oversight", "why": "why this answer matters", "context": "optional partial info already given"}],
  "resolvedParked": [{"question": "the exact text of a previously-parked question the owner just answered", "area": "trigger|steps|systems|decisions|exceptions|volumes|oversight"}],
  "done": false
}
Omit "parkedQuestions"/"resolvedParked" (or use []) on turns where nothing was deferred/resolved.

Node data objects must include "nodeType" and "name". Node schemas by type:
- trigger: {nodeType, name, triggerType: "event|scheduled|manual", description, configuration}
- work: {nodeType, name, workerType: "agent|automation|human", goal, inputs: [{name, required}], tasks: [string], outputs: [{name, required}], integrations: [string], guardrails?: [string], successCriteria?: [string], hitl?: {mode, reviewer, sla, samplingRate, escalationPath}}
- decision: {nodeType, name, description, conditions: [{id, label, description}]}
- router: {nodeType, name, description, classifierInstructions, routes: [{id, label, description}], fallbackRoute}
- parallel: {nodeType, name, mode: "split|join", description, branches: [{id, label, description}], joinBehavior: "wait-all|wait-any|merge-results"}
- orchestrator: {nodeType, name, goal, delegationStrategy, workers: [{id, name, description, skills: [string]}], synthesis, terminationCondition, maxIterations, budget, inputs, outputs, hitl?}
- agentLoop: {nodeType, name, goal, inputs, outputs, maxIterations, memory, integrations: [string], skills: [string], tools: [string], stopCondition, guardrails?: [string], successCriteria?: [string], failureHandling?, hitl?}
- evaluatorOptimizer: {nodeType, name, goal, generatorDescription, evaluatorCriteria: [string], passCondition, maxIterations, onMaxIterations, inputs, outputs, hitl?}
- end: {nodeType, name, description, outcome}
Always set ai_generated: true and an ai_confidence on nodes you create.

Set "done": true when every coverage area is covered, or when the person says they're done for now (they may still have parked questions outstanding) — then "message" should be a brief summary of the blueprint, any remaining low-confidence areas, and a count of how many questions remain parked for them to go answer, with no question.`,
    userPromptTemplate: `{{MODE_INSTRUCTIONS}}

## What the process owner said to start
{{PROCESS_CONTEXT}}

## Current canvas state
{{BLUEPRINT_STATE}}

Begin the interview. Remember: respond only with the JSON object.`,
  },

  patternRecommend: {
    systemPrompt: `You are an expert agentic-workflow architect. Given a process description, you recommend the single best ORCHESTRATION PATTERN to build it as an agentic workflow.

Follow the house rule: prefer the SIMPLEST pattern that satisfies the process. Escalate to a more agentic pattern only when a named failure mode of the simpler one actually appears (steps that cannot be fixed in advance, a need for specialist isolation, a scale/parallelism ceiling, or output that must iterate against clear criteria).

Return ONLY a JSON object with this exact structure, no other text:
{
  "patternId": "pipeline | routing | parallel | orchestrator | evaluator | agent",
  "rationale": "1-2 sentences explaining why this pattern fits the process",
  "confidence": "high | medium | low"
}`,
    userPromptTemplate: `## Available orchestration patterns
{{PATTERN_CATALOG}}

## Process documentation
{{EXTRACTED_CONTENT}}

Recommend the single best pattern for building this process as an agentic workflow. Return ONLY the JSON object.`,
  },

  bestPracticesAnalysis: {
    systemPrompt: `You are an expert workflow analyst. You will be given a blueprint description and a set of best practices. Analyze the blueprint for violations of these best practices.

Return ONLY a JSON array of violations found. Each violation should be an object with:
- "code": a string like "BP001", "BP002", etc. (sequential)
- "message": a clear description of the violation and which best practice it violates
- "nodeId": the node ID involved (string), or null if it's a blueprint-level issue
- "nodeName": the node name involved (string), or null if it's a blueprint-level issue

If no violations are found, return an empty array: []

Return ONLY the JSON array, no other text.`,
    userPromptTemplate: `## Best Practices
{{BEST_PRACTICES_TEXT}}

## Blueprint
{{BLUEPRINT_TEXT}}

Analyze this blueprint against the best practices above and return a JSON array of violations.`,
  },
  evalGenerate: {
    systemPrompt: `You are an evaluation engineer. You design the eval suite for an agentic workflow that is about to be built, so the team can tell whether it is actually working in production.

You will be given eval-design rules, a blueprint's metadata, a full description of every node and connection, and the evals the blueprint already has.

Return ONLY a JSON array of eval objects. Each object has:
- "title": short name for the eval (under 60 characters)
- "dimension": one of "outcome", "trajectory", "quality", "safety", "oversight", "efficiency"
- "graderType": one of "deterministic", "llm-judge", "human-review", "hybrid"
- "question": the single binary pass/fail question this eval answers, phrased as a question
- "passCriteria": what counts as a pass, checkable by someone who was not in the room
- "dataNeeded": the test cases, traces or fixtures required, including roughly how many and what must be labeled
- "failureMode": the concrete failure in THIS workflow that the eval protects against
- "linkedNodeId": the node ID this eval targets, or null for a workflow-level eval
- "priority": "high", "medium" or "low"
- "confidence": "high", "medium" or "low" — how confident you are this eval matters for this workflow
- "notes": optional short note, e.g. an assumption you had to make

Use only node IDs that appear in the blueprint description. If an eval is about the workflow as a whole, use null.

Return ONLY the JSON array, no other text.`,
    userPromptTemplate: `## Eval design rules
{{EVAL_PRACTICES}}

## Blueprint metadata
{{BLUEPRINT_METADATA}}

## Blueprint
{{BLUEPRINT_TEXT}}

## Evals this blueprint already has
{{EXISTING_EVALS}}

Propose 5-6 evals for this workflow, following the rules above.

Requirements for this set:
- At least two evals must be workflow-level (linkedNodeId = null).
- Span at least three different dimensions.
- Prefer "deterministic" graders wherever the check is mechanically verifiable.
- Ground every eval in something actually on this canvas — a specific node, route, guardrail, loop bound, human gate, or the stated goal.
- Do not repeat or restate anything in "Evals this blueprint already has".

Return the JSON array.`,
  },
};

// ── Public API ────────────────────────────────────────────────────────

export function getDefaultPrompts(feature: AIFeatureKey): AIFeaturePrompts {
  return { ...DEFAULT_PROMPTS[feature] };
}

export function loadCustomPrompts(feature: AIFeatureKey): AIFeaturePrompts | null {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + feature);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AIFeaturePrompts & { lastModified?: string };
    // Accept both shapes (with or without lastModified)
    return {
      systemPrompt: parsed.systemPrompt,
      userPromptTemplate: parsed.userPromptTemplate,
    };
  } catch (error) {
    console.error(`Failed to load custom prompts for ${feature}:`, error);
    return null;
  }
}

export function saveCustomPrompts(feature: AIFeatureKey, prompts: AIFeaturePrompts): void {
  if (prompts.systemPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`System prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
  }
  if (prompts.userPromptTemplate.length > MAX_PROMPT_LENGTH) {
    throw new Error(`User prompt template exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
  }
  try {
    const toSave = {
      ...prompts,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_PREFIX + feature, JSON.stringify(toSave));
  } catch (error) {
    console.error(`Failed to save custom prompts for ${feature}:`, error);
    throw new Error('Failed to save prompts');
  }
}

export function resetFeaturePrompts(feature: AIFeatureKey): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + feature);
  } catch (error) {
    console.error(`Failed to reset prompts for ${feature}:`, error);
  }
}

export function getActivePrompts(feature: AIFeatureKey): AIFeaturePrompts {
  const custom = loadCustomPrompts(feature);
  return custom || getDefaultPrompts(feature);
}

export function isFeatureCustomized(feature: AIFeatureKey): boolean {
  return localStorage.getItem(STORAGE_PREFIX + feature) !== null;
}

/**
 * One-time migration: move old smart-import prompts to new centralized key.
 */
export function migrateSmartImportPrompts(): void {
  try {
    const oldData = localStorage.getItem(OLD_SMART_IMPORT_KEY);
    if (!oldData) return;

    // Only migrate if new key doesn't already exist
    if (!localStorage.getItem(STORAGE_PREFIX + 'smartImport')) {
      const parsed = JSON.parse(oldData);
      const toSave = {
        systemPrompt: parsed.systemPrompt,
        userPromptTemplate: parsed.userPromptTemplate,
        lastModified: parsed.lastModified || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_PREFIX + 'smartImport', JSON.stringify(toSave));
    }

    localStorage.removeItem(OLD_SMART_IMPORT_KEY);
  } catch (error) {
    console.error('Failed to migrate smart import prompts:', error);
  }
}

// Run migration on module load
migrateSmartImportPrompts();
