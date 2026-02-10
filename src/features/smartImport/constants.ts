import type { SmartImportOptions } from './types';
import { getActivePrompts } from './utils/promptStorage';

// API Configuration
export const SMART_IMPORT_CONFIG = {
  // File constraints
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_FILES: 5,
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.pdf', '.docx'] as const,
  SUPPORTED_MIME_TYPES: [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,

  // API settings
  API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 8192,
  TIMEOUT_MS: 120000, // 2 minutes

  // Token estimation (rough)
  CHARS_PER_TOKEN: 4,
  MAX_INPUT_TOKENS: 180000,

  // Layout
  LAYOUT: {
    START_X: 100,
    START_Y: 100,
    HORIZONTAL_SPACING: 280,
    VERTICAL_SPACING: 160,
    MAX_NODES_PER_COLUMN: 6,
  },

  // Storage
  API_KEY_STORAGE_KEY: 'blueprint-builder:claude-api-key',
} as const;

// Prompt Templates
export const SYSTEM_PROMPT = `You are an expert process analyst and workflow designer. Your task is to analyze process documentation and generate a structured workflow blueprint.

You must respond with valid JSON matching the exact schema provided. Do not include any text outside the JSON structure.`;

const OPTIMIZATION_INSTRUCTIONS = {
  maximize_automation: `Prefer 'agent' and 'automation' worker types. Minimize human intervention. Only include human nodes where legally required or for critical decisions.`,
  balanced: `Use a balanced mix of agent, automation, and human worker types. Include human checkpoints for important decisions while automating routine tasks.`,
  human_in_loop: `Keep humans involved at key decision points. Use automation for data gathering but ensure human review before significant actions.`,
} as const;

const GRANULARITY_INSTRUCTIONS = {
  high_level: `Create 5-10 nodes representing major process phases. Focus on the main workflow stages without detailed sub-steps.`,
  detailed: `Create 10-25 nodes covering all significant activities. Include important sub-processes but avoid micro-steps.`,
  click_level: `Create a comprehensive workflow with 20-50+ nodes. Include every action, verification step, and edge case handling.`,
} as const;

/**
 * Get the active system prompt (custom or default)
 */
export function getActiveSystemPrompt(): string {
  const prompts = getActivePrompts();
  return prompts.systemPrompt;
}

export function buildUserPrompt(
  extractedContent: string,
  options: SmartImportOptions
): string {
  // Get active prompt template
  const prompts = getActivePrompts();
  const template = prompts.userPromptTemplate;

  // Build replacement values
  const optimizationInstructions = OPTIMIZATION_INSTRUCTIONS[options.optimizationGoal];
  const granularityInstructions = GRANULARITY_INSTRUCTIONS[options.granularity];
  const additionalInstructions = options.additionalInstructions
    ? `Additional Instructions: ${options.additionalInstructions}`
    : '';

  // Replace placeholders in template
  return template
    .replace('{{EXTRACTED_CONTENT}}', extractedContent)
    .replace('{{PROCESS_NAME}}', options.processName || 'Generated Process')
    .replace('{{OPTIMIZATION_GOAL}}', options.optimizationGoal)
    .replace('{{OPTIMIZATION_INSTRUCTIONS}}', optimizationInstructions)
    .replace('{{GRANULARITY}}', options.granularity)
    .replace('{{GRANULARITY_INSTRUCTIONS}}', granularityInstructions)
    .replace('{{ADDITIONAL_INSTRUCTIONS}}', additionalInstructions);
}

// Keep old implementation as fallback
export function buildUserPromptLegacy(
  extractedContent: string,
  options: SmartImportOptions
): string {
  return `
## Process Documentation

${extractedContent}

## Configuration

Process Name: ${options.processName || 'Generated Process'}

Optimization Goal: ${options.optimizationGoal}
${OPTIMIZATION_INSTRUCTIONS[options.optimizationGoal]}

Granularity Level: ${options.granularity}
${GRANULARITY_INSTRUCTIONS[options.granularity]}

${options.additionalInstructions ? `Additional Instructions: ${options.additionalInstructions}` : ''}

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
}

// Step labels for progress display
export const STEP_LABELS: Record<string, string> = {
  idle: 'Ready',
  reading: 'Reading documents...',
  analyzing: 'Analyzing process...',
  generating: 'Generating blueprint...',
  layouting: 'Arranging nodes...',
  complete: 'Complete!',
  error: 'Error occurred',
};
