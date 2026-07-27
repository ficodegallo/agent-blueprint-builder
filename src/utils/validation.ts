import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';
import type { OrchestrationPatternId } from '../features/patterns/types';

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
  MISSING_TERMINATION: 'E006',
  MISSING_STOP_CONDITION: 'E007',
} as const;

// Warning codes
const WARNING_CODES = {
  MISSING_NAME: 'W001',
  EMPTY_INPUTS: 'W002',
  EMPTY_TASKS: 'W003',
  FEW_DECISION_BRANCHES: 'W004',
  LONG_CHAIN: 'W005',
  BROKEN_WORKFLOW_LINK: 'W006',
  FEW_ROUTER_ROUTES: 'W007',
  NO_EVALUATOR_CRITERIA: 'W008',
  SPLIT_WITHOUT_JOIN: 'W009',
  NO_ORCHESTRATOR_WORKERS: 'W010',
  PATTERN_MISMATCH: 'W011',
} as const;

// The node type each non-trivial pattern expects on the canvas. Absence is an
// advisory warning (the pattern is design intent, not an enforced contract).
const PATTERN_EXPECTED_NODE: Partial<Record<OrchestrationPatternId, { nodeType: string; label: string }>> = {
  routing: { nodeType: 'router', label: 'a Router node' },
  orchestrator: { nodeType: 'orchestrator', label: 'an Orchestrator node' },
  parallel: { nodeType: 'parallel', label: 'a Parallel split/join' },
  evaluator: { nodeType: 'evaluatorOptimizer', label: 'an Evaluator loop' },
  agent: { nodeType: 'agentLoop', label: 'an Agent Loop node' },
};

export function validateBlueprint(
  nodes: AppNode[],
  edges: BlueprintEdge[],
  existingBlueprintIds?: Set<string>,
  orchestrationPattern?: OrchestrationPatternId
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

    // Orchestrator: open-ended delegation loops are a common failure mode
    if (node.data.nodeType === 'orchestrator') {
      const term = (node.data as Record<string, unknown>).terminationCondition as string | undefined;
      if (!term || term.trim() === '') {
        errors.push({
          id: `${ERROR_CODES.MISSING_TERMINATION}-${node.id}`,
          severity: 'error',
          code: ERROR_CODES.MISSING_TERMINATION,
          message: `Orchestrator "${node.data.name}" has no termination condition`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
      const workers = (node.data as Record<string, unknown>).workers as unknown[] | undefined;
      if (!workers || workers.length === 0) {
        warnings.push({
          id: `${WARNING_CODES.NO_ORCHESTRATOR_WORKERS}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.NO_ORCHESTRATOR_WORKERS,
          message: `Orchestrator "${node.data.name}" has no workers defined`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }

    // Agent loop: must know when to stop
    if (node.data.nodeType === 'agentLoop') {
      const stop = (node.data as Record<string, unknown>).stopCondition as string | undefined;
      if (!stop || stop.trim() === '') {
        errors.push({
          id: `${ERROR_CODES.MISSING_STOP_CONDITION}-${node.id}`,
          severity: 'error',
          code: ERROR_CODES.MISSING_STOP_CONDITION,
          message: `Agent loop "${node.data.name}" has no stop condition`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }

    // Router: needs at least 2 routes to be meaningful
    if (node.data.nodeType === 'router') {
      const routes = (node.data as Record<string, unknown>).routes as unknown[] | undefined;
      if (!routes || routes.length < 2) {
        warnings.push({
          id: `${WARNING_CODES.FEW_ROUTER_ROUTES}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.FEW_ROUTER_ROUTES,
          message: `Router "${node.data.name}" has fewer than 2 routes`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }

    // Evaluator-optimizer: an evaluator without criteria can't evaluate
    if (node.data.nodeType === 'evaluatorOptimizer') {
      const criteria = (node.data as Record<string, unknown>).evaluatorCriteria as unknown[] | undefined;
      if (!criteria || criteria.length === 0) {
        warnings.push({
          id: `${WARNING_CODES.NO_EVALUATOR_CRITERIA}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.NO_EVALUATOR_CRITERIA,
          message: `Evaluator loop "${node.data.name}" has no evaluator criteria`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }

    // Workflow node: check for broken cross-blueprint link
    if (node.data.nodeType === 'workflow' && existingBlueprintIds) {
      const wfId = (node.data as Record<string, unknown>).workflowId as string | undefined;
      if (wfId && !existingBlueprintIds.has(wfId)) {
        warnings.push({
          id: `${WARNING_CODES.BROKEN_WORKFLOW_LINK}-${node.id}`,
          severity: 'warning',
          code: WARNING_CODES.BROKEN_WORKFLOW_LINK,
          message: `"${node.data.name}" references a blueprint that no longer exists`,
          nodeId: node.id,
          nodeName: node.data.name,
        });
      }
    }
  });

  // Blueprint-level: parallel split without a downstream join
  const splits = nodes.filter(
    (n) => n.data.nodeType === 'parallel' && (n.data as Record<string, unknown>).mode === 'split'
  );
  const joins = nodes.filter(
    (n) => n.data.nodeType === 'parallel' && (n.data as Record<string, unknown>).mode === 'join'
  );
  if (splits.length > 0 && joins.length === 0) {
    warnings.push({
      id: `${WARNING_CODES.SPLIT_WITHOUT_JOIN}-global`,
      severity: 'warning',
      code: WARNING_CODES.SPLIT_WITHOUT_JOIN,
      message: 'Blueprint has a parallel split but no parallel join — branches never converge',
    });
  }

  // Blueprint-level: the chosen pattern implies a signature node type. Advisory
  // only — the graph can legitimately drift from the pattern's scaffold.
  const expected = orchestrationPattern ? PATTERN_EXPECTED_NODE[orchestrationPattern] : undefined;
  if (expected && !nodes.some((n) => n.data.nodeType === expected.nodeType)) {
    warnings.push({
      id: `${WARNING_CODES.PATTERN_MISMATCH}-global`,
      severity: 'warning',
      code: WARNING_CODES.PATTERN_MISMATCH,
      message: `This blueprint's pattern expects ${expected.label}, but the canvas has none`,
    });
  }

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
