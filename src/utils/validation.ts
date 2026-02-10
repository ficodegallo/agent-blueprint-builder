import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  nodeId?: string;
  nodeName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  all: ValidationIssue[];
}

// Error codes
const ERROR_CODES = {
  NO_TRIGGER: 'E001',
  NO_END: 'E002',
  DISCONNECTED_NODE: 'E003',
  MISSING_GOAL: 'E004',
  UNREACHABLE_NODE: 'E005',
} as const;

// Warning codes
const WARNING_CODES = {
  MISSING_NAME: 'W001',
  EMPTY_INPUTS: 'W002',
  EMPTY_TASKS: 'W003',
  FEW_DECISION_BRANCHES: 'W004',
  LONG_CHAIN: 'W005',
} as const;

export function validateBlueprint(
  nodes: AppNode[],
  edges: BlueprintEdge[]
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check for at least one trigger node
  const triggerNodes = nodes.filter((n) => n.data.nodeType === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push({
      id: `${ERROR_CODES.NO_TRIGGER}-global`,
      severity: 'error',
      code: ERROR_CODES.NO_TRIGGER,
      message: 'Blueprint must have at least one Trigger node',
    });
  }

  // Check for at least one end node
  const endNodes = nodes.filter((n) => n.data.nodeType === 'end');
  if (endNodes.length === 0) {
    errors.push({
      id: `${ERROR_CODES.NO_END}-global`,
      severity: 'error',
      code: ERROR_CODES.NO_END,
      message: 'Blueprint must have at least one End node',
    });
  }

  // Build connectivity maps
  const incomingEdges = new Map<string, BlueprintEdge[]>();
  const outgoingEdges = new Map<string, BlueprintEdge[]>();

  edges.forEach((edge) => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge);

    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  });

  // Check each node
  nodes.forEach((node) => {
    const incoming = incomingEdges.get(node.id) || [];
    const outgoing = outgoingEdges.get(node.id) || [];

    // Disconnected node check (no connections at all)
    if (node.data.nodeType !== 'trigger' && incoming.length === 0) {
      // Non-trigger nodes should have incoming connections
      errors.push({
        id: `${ERROR_CODES.DISCONNECTED_NODE}-${node.id}`,
        severity: 'error',
        code: ERROR_CODES.DISCONNECTED_NODE,
        message: `"${node.data.name}" has no incoming connections`,
        nodeId: node.id,
        nodeName: node.data.name,
      });
    }

    if (node.data.nodeType !== 'end' && outgoing.length === 0) {
      // Non-end nodes should have outgoing connections
      errors.push({
        id: `${ERROR_CODES.DISCONNECTED_NODE}-${node.id}-out`,
        severity: 'error',
        code: ERROR_CODES.DISCONNECTED_NODE,
        message: `"${node.data.name}" has no outgoing connections`,
        nodeId: node.id,
        nodeName: node.data.name,
      });
    }

    // Check for missing required fields based on node type
    if (!node.data.name || node.data.name.trim() === '') {
      warnings.push({
        id: `${WARNING_CODES.MISSING_NAME}-${node.id}`,
        severity: 'warning',
        code: WARNING_CODES.MISSING_NAME,
        message: 'Node is missing a name',
        nodeId: node.id,
        nodeName: node.data.name || 'Unnamed',
      });
    }

    // Work node specific validations
    if (node.data.nodeType === 'work') {
      if (!node.data.goal || node.data.goal.trim() === '') {
        errors.push({
          id: `${ERROR_CODES.MISSING_GOAL}-${node.id}`,
          severity: 'error',
          code: ERROR_CODES.MISSING_GOAL,
          message: `"${node.data.name}" is missing a goal`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }

      if (!node.data.inputs || node.data.inputs.length === 0) {
        warnings.push({
          id: `${WARNING_CODES.EMPTY_INPUTS}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.EMPTY_INPUTS,
          message: `"${node.data.name}" has no inputs defined`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }

      if (!node.data.tasks || node.data.tasks.length === 0) {
        warnings.push({
          id: `${WARNING_CODES.EMPTY_TASKS}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.EMPTY_TASKS,
          message: `"${node.data.name}" has no tasks defined`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }

    // Decision node specific validations
    if (node.data.nodeType === 'decision') {
      if (outgoing.length < 2) {
        warnings.push({
          id: `${WARNING_CODES.FEW_DECISION_BRANCHES}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.FEW_DECISION_BRANCHES,
          message: `Decision node "${node.data.name}" has fewer than 2 branches`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }
  });

  const all = [...errors, ...warnings];
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    all,
  };
}

export function getNodeValidationIssues(
  nodeId: string,
  validationResult: ValidationResult
): ValidationIssue[] {
  return validationResult.all.filter((issue) => issue.nodeId === nodeId);
}
