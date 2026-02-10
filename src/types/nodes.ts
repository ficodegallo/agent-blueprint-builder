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

// API Endpoint definition for integrations
export interface ApiEndpoint {
  id: string; // UUID for identification
  url: string; // Endpoint URL (e.g., "https://api.workday.com/v1/employees")
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
export type NodeType = 'trigger' | 'work' | 'decision' | 'end' | 'workflow';

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
export interface WorkNodeData extends BaseNodeData {
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

// Union type for all node data
export type NodeData = TriggerNodeData | WorkNodeData | DecisionNodeData | EndNodeData | WorkflowNodeData;

// React Flow Node types with our data
export type TriggerNode = Node<TriggerNodeData, 'trigger'>;
export type WorkNode = Node<WorkNodeData, 'work'>;
export type DecisionNode = Node<DecisionNodeData, 'decision'>;
export type EndNode = Node<EndNodeData, 'end'>;
export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>;

// Union type for all custom nodes
export type BlueprintNode = TriggerNode | WorkNode | DecisionNode | EndNode | WorkflowNode;

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
    ...partial,
  };
}
