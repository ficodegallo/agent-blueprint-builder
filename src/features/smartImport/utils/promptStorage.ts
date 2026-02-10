/**
 * Storage utility for custom Smart Import prompts
 */

const PROMPT_STORAGE_KEY = 'blueprint-builder:smart-import-prompts';

export interface StoredPrompts {
  systemPrompt: string;
  userPromptTemplate: string;
  lastModified: string;
}

/**
 * Get default prompts (from constants.ts)
 */
export function getDefaultPrompts(): StoredPrompts {
  const systemPrompt = `You are an expert process analyst and workflow designer. Your task is to analyze process documentation and generate a structured workflow blueprint.

You must respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON structure.`;

  const userPromptTemplate = `## Process Documentation

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

Respond ONLY with the JSON object. No additional text.`;

  return {
    systemPrompt,
    userPromptTemplate,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Load custom prompts from localStorage
 */
export function loadCustomPrompts(): StoredPrompts | null {
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredPrompts;
    return parsed;
  } catch (error) {
    console.error('Failed to load custom prompts:', error);
    return null;
  }
}

/**
 * Save custom prompts to localStorage
 */
export function saveCustomPrompts(prompts: Omit<StoredPrompts, 'lastModified'>): void {
  try {
    const toSave: StoredPrompts = {
      ...prompts,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save custom prompts:', error);
    throw new Error('Failed to save prompts');
  }
}

/**
 * Reset to default prompts
 */
export function resetToDefaultPrompts(): void {
  try {
    localStorage.removeItem(PROMPT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset prompts:', error);
  }
}

/**
 * Get active prompts (custom if exists, otherwise default)
 */
export function getActivePrompts(): StoredPrompts {
  const custom = loadCustomPrompts();
  return custom || getDefaultPrompts();
}
