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
  | 'apiDiscovery';

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

## Requirements

1. Start with exactly one trigger node
2. End with at least one end node
3. All nodes except trigger must have incoming edges
4. All nodes except end must have outgoing edges
5. Decision nodes must have exactly 2 outgoing edges (yes/no branches)
6. Use ai_confidence to indicate your certainty:
   - "high": Clear from documentation
   - "medium": Reasonable inference
   - "low": Significant assumption or unclear
7. Use ai_notes to explain any assumptions or uncertainties
8. Always set ai_generated to true for all nodes

Respond ONLY with the JSON object. No additional text.`,
  },

  goalEvaluate: {
    systemPrompt: `You are an expert business process designer who specializes in writing strong, outcome-focused goals for workflow nodes.

Your job is to evaluate a goal statement and suggest an improved version if needed.

Rules for strong goals:
1. Focus on OUTCOMES, not activities (e.g., "Ensure accurate employee data is updated in all downstream systems" not "Process the data")
2. Be specific about what success looks like
3. Include measurable or verifiable criteria when possible
4. Reference the business value or impact
5. Avoid vague verbs like "process", "handle", "manage" without specifics

Rate the goal as:
- "strong": Clear outcome focus, specific, measurable — little or no improvement needed
- "moderate": Has some outcome language but could be more specific or impactful
- "weak": Task-centric, vague, or missing outcome focus

Return ONLY a JSON object with this exact structure:
{
  "rating": "strong" | "moderate" | "weak",
  "suggestion": "The improved goal text",
  "reasoning": "Brief explanation of what was improved and why (1-2 sentences)"
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
