import type { SmartImportOptions } from './types';
import { getActivePrompts } from './utils/promptStorage';
import { AI_FEATURE_MODELS, ANTHROPIC_API_URL } from '../../constants/aiModels';
import { getPattern } from '../patterns/patterns';
import type { OrchestrationPatternId } from '../patterns/types';

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
  API_URL: ANTHROPIC_API_URL,
  MODEL: AI_FEATURE_MODELS.smartImport,
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

// How to shape the generated graph when a specific pattern is chosen. Keyed by
// OrchestrationPatternId; injected into the prompt only when a pattern is set.
const PATTERN_INSTRUCTIONS: Record<OrchestrationPatternId, string> = {
  pipeline:
    'Shape this as a SEQUENTIAL PIPELINE: a linear chain of "work" nodes in a fixed order, with "decision" gates only where a rule-based branch is genuinely needed. Do not introduce orchestrator, router, or agentLoop nodes.',
  routing:
    'Shape this around a ROUTING pattern: a "router" node classifies the input and dispatches to specialized downstream "work" paths, one per category. Give the router a route per distinct category.',
  parallel:
    'Shape this around PARALLELIZATION: a "parallel" split fans the work into independent branches that run concurrently, and a matching "parallel" join recombines them. Put the independent subtasks on separate branches.',
  orchestrator:
    'Shape this around ORCHESTRATOR-WORKERS: a single "orchestrator" node with a worker pool that decomposes the task at runtime and delegates to workers. Give it a termination condition and named workers.',
  evaluator:
    'Shape this around an EVALUATOR-OPTIMIZER loop: an "evaluatorOptimizer" node whose generator produces output and evaluator scores it against explicit criteria, iterating until it passes.',
  agent:
    'Shape this around a single AUTONOMOUS AGENT: an "agentLoop" node with the skills/tools needed for the process and a clear stop condition. Use this only because the steps genuinely cannot be laid out in advance.',
};

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
  const base = template
    .replace('{{EXTRACTED_CONTENT}}', extractedContent)
    .replace('{{PROCESS_NAME}}', options.processName || 'Generated Process')
    .replace('{{OPTIMIZATION_GOAL}}', options.optimizationGoal)
    .replace('{{OPTIMIZATION_INSTRUCTIONS}}', optimizationInstructions)
    .replace('{{GRANULARITY}}', options.granularity)
    .replace('{{GRANULARITY_INSTRUCTIONS}}', granularityInstructions)
    .replace('{{ADDITIONAL_INSTRUCTIONS}}', additionalInstructions);

  // When a pattern is chosen, append a directive so the graph is shaped to it.
  // Appended (not a template placeholder) so custom prompts keep working.
  return base + buildPatternDirective(options.orchestrationPattern);
}

/** Directive block appended to the generation prompt for a chosen pattern. */
export function buildPatternDirective(patternId: OrchestrationPatternId | null | undefined): string {
  if (!patternId) return '';
  const pattern = getPattern(patternId);
  if (!pattern) return '';
  return `\n\n## Required orchestration pattern: ${pattern.name}\n${PATTERN_INSTRUCTIONS[pattern.id]}`;
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
