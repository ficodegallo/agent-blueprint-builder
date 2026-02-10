import { v4 as uuidv4 } from 'uuid';
import type { Blueprint, SerializedNode } from '../../../types/blueprint';
import type { NodeData } from '../../../types/nodes';
import type { BlueprintEdge } from '../../../types/edges';
import type { ClaudeResponse, ClaudeGeneratedBlueprint } from '../types';

export interface ParseResult {
  success: boolean;
  blueprint?: Blueprint;
  error?: string;
  reasoning?: string;
}

/**
 * Extract JSON from Claude's response (handles markdown code blocks)
 */
function extractJson(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/**
 * Validate node data has required fields
 */
function isValidNodeData(data: Record<string, unknown>): boolean {
  if (!data.nodeType || typeof data.nodeType !== 'string') return false;
  if (!data.name || typeof data.name !== 'string') return false;

  const validTypes = ['trigger', 'work', 'decision', 'end', 'workflow'];
  if (!validTypes.includes(data.nodeType)) return false;

  return true;
}

/**
 * Validate the generated blueprint structure
 */
function validateBlueprint(blueprint: ClaudeGeneratedBlueprint): string | null {
  if (!blueprint.title || typeof blueprint.title !== 'string') {
    return 'Blueprint must have a title';
  }

  if (!Array.isArray(blueprint.nodes) || blueprint.nodes.length === 0) {
    return 'Blueprint must have at least one node';
  }

  if (!Array.isArray(blueprint.edges)) {
    return 'Blueprint must have an edges array';
  }

  // Validate each node
  const nodeIds = new Set<string>();
  for (const node of blueprint.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      return 'Each node must have an id';
    }
    if (nodeIds.has(node.id)) {
      return `Duplicate node id: ${node.id}`;
    }
    nodeIds.add(node.id);

    if (!node.type || typeof node.type !== 'string') {
      return `Node ${node.id} must have a type`;
    }

    if (!node.data || typeof node.data !== 'object') {
      return `Node ${node.id} must have data`;
    }

    if (!isValidNodeData(node.data as Record<string, unknown>)) {
      return `Node ${node.id} has invalid data structure`;
    }
  }

  // Validate edges reference existing nodes
  for (const edge of blueprint.edges) {
    if (!edge.source || !nodeIds.has(edge.source)) {
      return `Edge references unknown source node: ${edge.source}`;
    }
    if (!edge.target || !nodeIds.has(edge.target)) {
      return `Edge references unknown target node: ${edge.target}`;
    }
  }

  // Check for at least one trigger and one end node
  const hasTriggger = blueprint.nodes.some((n) => n.type === 'trigger');
  const hasEnd = blueprint.nodes.some((n) => n.type === 'end');

  if (!hasTriggger) {
    return 'Blueprint must have at least one trigger node';
  }
  if (!hasEnd) {
    return 'Blueprint must have at least one end node';
  }

  return null;
}

/**
 * Convert Claude's response to our Blueprint format
 */
function convertToBlueprint(response: ClaudeResponse): Blueprint {
  const blueprintId = uuidv4();
  const now = new Date().toISOString();

  // Convert nodes to SerializedNode format
  const nodes: SerializedNode[] = response.blueprint.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: 0, y: 0 }, // Will be set by auto-layout
    data: {
      ...node.data,
      ai_generated: true,
    } as NodeData,
  }));

  // Convert edges to BlueprintEdge format
  const edges: BlueprintEdge[] = response.blueprint.edges.map((edge) => ({
    id: uuidv4(),
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: undefined,
    data: {
      conditionLabel: edge.label || '',
      description: '',
    },
  }));

  return {
    id: blueprintId,
    title: response.blueprint.title,
    description: response.blueprint.description || '',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: 'AI Generated',
    lastModifiedBy: 'AI Generated',
    lastModifiedDate: now,
    version: '1.0',
    status: 'Draft',
    changeLog: [
      {
        id: uuidv4(),
        timestamp: now,
        author: 'AI Generated',
        description: 'Blueprint generated from process documentation',
      },
    ],
    nodes,
    edges,
    comments: [],
  };
}

/**
 * Parse and validate Claude's response
 */
export function parseClaudeResponse(responseText: string): ParseResult {
  try {
    // Extract JSON from response
    const jsonString = extractJson(responseText);

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        error: 'Failed to parse JSON response. The AI response may be malformed.',
      };
    }

    // Check if it's a ClaudeResponse
    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        error: 'Response is not a valid object',
      };
    }

    const response = parsed as Record<string, unknown>;

    // Check for blueprint property
    if (!response.blueprint || typeof response.blueprint !== 'object') {
      return {
        success: false,
        error: 'Response does not contain a blueprint object',
      };
    }

    const claudeResponse: ClaudeResponse = {
      blueprint: response.blueprint as ClaudeGeneratedBlueprint,
      reasoning: response.reasoning as string | undefined,
    };

    // Validate blueprint structure
    const validationError = validateBlueprint(claudeResponse.blueprint);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Convert to our Blueprint format
    const blueprint = convertToBlueprint(claudeResponse);

    return {
      success: true,
      blueprint,
      reasoning: claudeResponse.reasoning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing response',
    };
  }
}
