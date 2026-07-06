import type { Node } from '@xyflow/react';

// Trigger types
export type TriggerType = 'event' | 'scheduled' | 'manual';

// Worker types for Work nodes
export type WorkerType = 'agent' | 'automation' | 'human';

// Input/Output item with required flag
export interface IOItem {
  name: string;
  required: boolean;
}

// API parameter for discovered endpoints
export interface ApiParameter {
  name: string;
  type: string;            // "string", "integer", "boolean", etc.
  location: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  description: string;
}

// API response field for discovered endpoints
export interface ApiResponseField {
  name: string;
  type: string;
  json_path: string;       // e.g., "$.data.employee.firstName"
  description: string;
}

// API Endpoint definition for integrations
export interface ApiEndpoint {
  id: string; // UUID for identification
  url: string; // Endpoint URL (e.g., "https://api.workday.com/v1/employees")
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  // Rich fields (optional, for discovered endpoints)
  name?: string;
  description?: string;
  auth_type?: string;
  rate_limit?: string;
  parameters?: ApiParameter[];
  response_fields?: ApiResponseField[];
  documentation_url?: string;
  source?: 'discovered' | 'manual';
  ai_confidence?: 'high' | 'medium' | 'low';
  ai_notes?: string;
}

// Integration Input/Output mapping
export interface IntegrationIOMapping {
  description: string; // What this IO does in context of integration
  databaseField: string; // Database field mapping (e.g., "employee.firstName")
}

// Detailed integration definition
export interface IntegrationDetail {
  name: string; // Integration name (e.g., "Workday")
  action: string; // One-sentence summary of what integration does
  inputs: IntegrationIOMapping[]; // Selected from node's inputs
  outputs: IntegrationIOMapping[]; // Selected from node's outputs
  apiEndpoints: ApiEndpoint[]; // List of API endpoints used
}

// Node type identifiers
export type NodeType =
  | 'trigger'
  | 'work'
  | 'decision'
  | 'end'
  | 'workflow'
  | 'orchestrator'
  | 'agentLoop'
  | 'router'
  | 'parallel'
  | 'evaluatorOptimizer';

// ── Human-in-the-loop policy ─────────────────────────────────────────
// How humans oversee an automated node's actions — distinct from a human
// work node that performs a process step itself.
export type HitlMode = 'none' | 'notify' | 'sampled' | 'approval';

export interface HitlPolicy {
  mode: HitlMode;
  reviewer: string; // role or person responsible (e.g. "Ops Manager")
  sla: string; // e.g. "respond within 4 business hours"
  samplingRate: string; // for sampled mode, e.g. "10% of outputs"
  escalationPath: string; // what happens when review fails or times out
}

export function createHitlPolicy(partial?: Partial<HitlPolicy>): HitlPolicy {
  return {
    mode: 'none',
    reviewer: '',
    sla: '',
    samplingRate: '',
    escalationPath: '',
    ...partial,
  };
}

// ── Agent spec fields ────────────────────────────────────────────────
// Shared engineering-handoff fields for agent-type nodes. All optional so
// existing blueprints load unchanged.
export type AutonomyLevel = 'strict' | 'guided' | 'open';

export interface AgentSpecFields {
  // Routing contract: what the agent does + when to use it + differentiator
  description?: string;
  skills?: string[]; // reusable skills/capabilities attached to the agent
  tools?: string[]; // tools and systems the agent may call
  autonomyLevel?: AutonomyLevel; // strict = exact procedure, guided = templates, open = heuristics
  guardrails?: string[]; // hard constraints the agent must never violate
  successCriteria?: string[]; // verifiable checks that prove the goal was met
  stopCondition?: string; // when the agent should stop working
  failureHandling?: string; // what happens when the agent fails
  hitl?: HitlPolicy;
}

// AI confidence level for generated nodes
export type AIConfidence = 'high' | 'medium' | 'low';

// Base data interface that all nodes share - extends Record for React Flow compatibility
export interface BaseNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  name: string;
  // AI generation metadata (optional - for backward compatibility)
  ai_confidence?: AIConfidence;
  ai_notes?: string;
  ai_generated?: boolean;
}

// Trigger Node Data
export interface TriggerNodeData extends BaseNodeData {
  nodeType: 'trigger';
  triggerType: TriggerType;
  description: string;
  configuration: string;
}

// Work Node Data (Agent, Automation, Human)
export interface WorkNodeData extends BaseNodeData, AgentSpecFields {
  nodeType: 'work';
  workerType: WorkerType;
  goal: string;
  inputs: IOItem[];
  tasks: string[];
  outputs: IOItem[];
  // Enhanced integrations - supports both legacy string[] and new detailed format
  integrations: Array<string | IntegrationDetail>;
}

// Decision Node Data
export interface DecisionNodeData extends BaseNodeData {
  nodeType: 'decision';
  description: string;
  conditions: DecisionCondition[];
}

export interface DecisionCondition {
  id: string;
  label: string;
  description: string;
}

// End Node Data
export interface EndNodeData extends BaseNodeData {
  nodeType: 'end';
  description: string;
  outcome: string;
}

// Workflow Node Data (references another workflow/blueprint)
export interface WorkflowNodeData extends BaseNodeData {
  nodeType: 'workflow';
  description: string;
  workflowId: string; // ID of the referenced workflow/blueprint
  workflowName: string; // Display name of the referenced workflow
  inputs: IOItem[]; // Inputs passed to the workflow
  outputs: IOItem[]; // Expected outputs from the workflow
  version: string; // Version of the referenced workflow
}

// ── Agentic pattern nodes ────────────────────────────────────────────

// A worker in an orchestrator's dynamic pool. Workers are defined inside the
// orchestrator (not as separate canvas nodes) because their invocation is
// decided at runtime by the manager, not by static control flow.
export interface OrchestratorWorker {
  id: string;
  name: string;
  description: string; // routing contract: what this worker handles and when
  skills: string[];
}

export function createOrchestratorWorker(partial?: Partial<OrchestratorWorker>): OrchestratorWorker {
  return {
    id: `worker-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    description: '',
    skills: [],
    ...partial,
  };
}

// Orchestrator-workers pattern: a manager agent decomposes the work,
// delegates to a pool of workers, and synthesizes their results.
export interface OrchestratorNodeData extends BaseNodeData, AgentSpecFields {
  nodeType: 'orchestrator';
  goal: string;
  delegationStrategy: string; // how the manager decomposes and assigns work
  workers: OrchestratorWorker[];
  synthesis: string; // how worker outputs are combined into the final result
  terminationCondition: string; // when the manager stops delegating
  maxIterations: string; // e.g. "10 delegation rounds"
  budget: string; // token / cost / time budget for the whole loop
  inputs: IOItem[];
  outputs: IOItem[];
}

// Autonomous agent loop: one agent with attached skills/tools working
// toward a goal until a stop condition is met.
export interface AgentLoopNodeData extends BaseNodeData, AgentSpecFields {
  nodeType: 'agentLoop';
  goal: string;
  inputs: IOItem[];
  outputs: IOItem[];
  maxIterations: string;
  memory: string; // what context or memory the agent maintains across iterations
  integrations: Array<string | IntegrationDetail>;
}

// Router: model-driven classification into one of several routes.
// Distinct from Decision, which is rule-based branching.
export interface RouteCondition {
  id: string;
  label: string;
  description: string; // what inputs belong on this route
}

export interface RouterNodeData extends BaseNodeData {
  nodeType: 'router';
  description: string;
  classifierInstructions: string; // instructions for the classifying model
  routes: RouteCondition[];
  fallbackRoute: string; // route label used when classification is uncertain
}

// Parallel gateway: fan work out across branches (split) or wait for
// branches to finish and merge results (join).
export type ParallelMode = 'split' | 'join';
export type JoinBehavior = 'wait-all' | 'wait-any' | 'merge-results';

export interface ParallelBranch {
  id: string;
  label: string;
  description: string;
}

export interface ParallelNodeData extends BaseNodeData {
  nodeType: 'parallel';
  mode: ParallelMode;
  description: string;
  branches: ParallelBranch[]; // split mode only
  joinBehavior: JoinBehavior; // join mode only
}

// Evaluator-optimizer loop: a generator produces output, an evaluator
// scores it against criteria, and the loop repeats until it passes.
export interface EvaluatorOptimizerNodeData extends BaseNodeData, AgentSpecFields {
  nodeType: 'evaluatorOptimizer';
  goal: string;
  generatorDescription: string; // what the generator produces
  evaluatorCriteria: string[]; // checks the evaluator scores against
  passCondition: string; // what counts as passing (e.g. "all criteria met")
  maxIterations: string;
  onMaxIterations: string; // what happens if it never passes (e.g. escalate to human)
  inputs: IOItem[];
  outputs: IOItem[];
}

// Union type for all node data
export type NodeData =
  | TriggerNodeData
  | WorkNodeData
  | DecisionNodeData
  | EndNodeData
  | WorkflowNodeData
  | OrchestratorNodeData
  | AgentLoopNodeData
  | RouterNodeData
  | ParallelNodeData
  | EvaluatorOptimizerNodeData;

// React Flow Node types with our data
export type TriggerNode = Node<TriggerNodeData, 'trigger'>;
export type WorkNode = Node<WorkNodeData, 'work'>;
export type DecisionNode = Node<DecisionNodeData, 'decision'>;
export type EndNode = Node<EndNodeData, 'end'>;
export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>;
export type OrchestratorNode = Node<OrchestratorNodeData, 'orchestrator'>;
export type AgentLoopNode = Node<AgentLoopNodeData, 'agentLoop'>;
export type RouterNode = Node<RouterNodeData, 'router'>;
export type ParallelNode = Node<ParallelNodeData, 'parallel'>;
export type EvaluatorOptimizerNode = Node<EvaluatorOptimizerNodeData, 'evaluatorOptimizer'>;

// Union type for all custom nodes
export type BlueprintNode =
  | TriggerNode
  | WorkNode
  | DecisionNode
  | EndNode
  | WorkflowNode
  | OrchestratorNode
  | AgentLoopNode
  | RouterNode
  | ParallelNode
  | EvaluatorOptimizerNode;

// Node types that represent an AI agent and carry the agent spec fields
export const AGENTIC_NODE_TYPES: NodeType[] = ['work', 'orchestrator', 'agentLoop', 'evaluatorOptimizer'];

// Type guard functions
export function isTriggerNode(node: BlueprintNode): node is TriggerNode {
  return node.data.nodeType === 'trigger';
}

export function isWorkNode(node: BlueprintNode): node is WorkNode {
  return node.data.nodeType === 'work';
}

export function isDecisionNode(node: BlueprintNode): node is DecisionNode {
  return node.data.nodeType === 'decision';
}

export function isEndNode(node: BlueprintNode): node is EndNode {
  return node.data.nodeType === 'end';
}

export function isWorkflowNode(node: BlueprintNode): node is WorkflowNode {
  return node.data.nodeType === 'workflow';
}

export function isOrchestratorNode(node: BlueprintNode): node is OrchestratorNode {
  return node.data.nodeType === 'orchestrator';
}

export function isAgentLoopNode(node: BlueprintNode): node is AgentLoopNode {
  return node.data.nodeType === 'agentLoop';
}

export function isRouterNode(node: BlueprintNode): node is RouterNode {
  return node.data.nodeType === 'router';
}

export function isParallelNode(node: BlueprintNode): node is ParallelNode {
  return node.data.nodeType === 'parallel';
}

export function isEvaluatorOptimizerNode(node: BlueprintNode): node is EvaluatorOptimizerNode {
  return node.data.nodeType === 'evaluatorOptimizer';
}

// Default data factories
export function createTriggerNodeData(partial?: Partial<TriggerNodeData>): TriggerNodeData {
  return {
    nodeType: 'trigger',
    name: 'New Trigger',
    triggerType: 'event',
    description: '',
    configuration: '',
    ...partial,
  };
}

export function createWorkNodeData(partial?: Partial<WorkNodeData>): WorkNodeData {
  return {
    nodeType: 'work',
    name: 'New Work Node',
    workerType: 'agent',
    goal: '',
    inputs: [],
    tasks: [],
    outputs: [],
    integrations: [],
    ...partial,
  };
}

// Helper to convert string[] to IOItem[] (for migration)
export function stringsToIOItems(strings: string[]): IOItem[] {
  return strings.map((name) => ({ name, required: true }));
}

export function createDecisionNodeData(partial?: Partial<DecisionNodeData>): DecisionNodeData {
  return {
    nodeType: 'decision',
    name: 'New Decision',
    description: '',
    conditions: [],
    ...partial,
  };
}

export function createEndNodeData(partial?: Partial<EndNodeData>): EndNodeData {
  return {
    nodeType: 'end',
    name: 'End',
    description: '',
    outcome: '',
    ...partial,
  };
}

export function createWorkflowNodeData(partial?: Partial<WorkflowNodeData>): WorkflowNodeData {
  return {
    nodeType: 'workflow',
    name: 'Sub-Workflow',
    description: '',
    workflowId: '',
    workflowName: '',
    inputs: [],
    outputs: [],
    version: '1.0',
    ...partial,
  };
}

export function createOrchestratorNodeData(partial?: Partial<OrchestratorNodeData>): OrchestratorNodeData {
  return {
    nodeType: 'orchestrator',
    name: 'New Orchestrator',
    goal: '',
    delegationStrategy: '',
    workers: [],
    synthesis: '',
    terminationCondition: '',
    maxIterations: '',
    budget: '',
    inputs: [],
    outputs: [],
    ...partial,
  };
}

export function createAgentLoopNodeData(partial?: Partial<AgentLoopNodeData>): AgentLoopNodeData {
  return {
    nodeType: 'agentLoop',
    name: 'New Agent Loop',
    goal: '',
    inputs: [],
    outputs: [],
    maxIterations: '',
    memory: '',
    integrations: [],
    skills: [],
    tools: [],
    stopCondition: '',
    ...partial,
  };
}

export function createRouterNodeData(partial?: Partial<RouterNodeData>): RouterNodeData {
  return {
    nodeType: 'router',
    name: 'New Router',
    description: '',
    classifierInstructions: '',
    routes: [],
    fallbackRoute: '',
    ...partial,
  };
}

export function createParallelNodeData(partial?: Partial<ParallelNodeData>): ParallelNodeData {
  return {
    nodeType: 'parallel',
    name: 'Parallel Split',
    mode: 'split',
    description: '',
    branches: [],
    joinBehavior: 'wait-all',
    ...partial,
  };
}

export function createEvaluatorOptimizerNodeData(
  partial?: Partial<EvaluatorOptimizerNodeData>
): EvaluatorOptimizerNodeData {
  return {
    nodeType: 'evaluatorOptimizer',
    name: 'New Evaluator Loop',
    goal: '',
    generatorDescription: '',
    evaluatorCriteria: [],
    passCondition: '',
    maxIterations: '',
    onMaxIterations: '',
    inputs: [],
    outputs: [],
    ...partial,
  };
}

// Integration migration helpers

// Type guard to check if integration is detailed format
export function isDetailedIntegration(
  integration: string | IntegrationDetail
): integration is IntegrationDetail {
  return typeof integration === 'object' && integration !== null && 'action' in integration;
}

// Convert legacy string integration to detailed format
export function stringToDetailedIntegration(name: string): IntegrationDetail {
  return {
    name,
    action: '',
    inputs: [],
    outputs: [],
    apiEndpoints: [],
  };
}

// Ensure all integrations are in detailed format (migration helper)
export function migrateIntegrations(
  integrations: Array<string | IntegrationDetail>
): IntegrationDetail[] {
  return integrations.map((integration) =>
    isDetailedIntegration(integration)
      ? integration
      : stringToDetailedIntegration(integration)
  );
}

// Create empty API endpoint
export function createApiEndpoint(partial?: Partial<ApiEndpoint>): ApiEndpoint {
  return {
    id: '',
    url: '',
    method: 'GET',
    source: 'manual',
    ...partial,
  };
}
