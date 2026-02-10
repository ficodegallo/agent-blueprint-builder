import type {
  TriggerNodeData,
  WorkNodeData,
  DecisionNodeData,
  EndNodeData,
  WorkflowNodeData,
} from '../types';

export interface NodeTemplate {
  id: string;
  category: 'trigger' | 'agent' | 'automation' | 'human' | 'flow' | 'workflow';
  name: string;
  description: string;
  data: TriggerNodeData | WorkNodeData | DecisionNodeData | EndNodeData | WorkflowNodeData;
}

export const TEMPLATES: NodeTemplate[] = [
  // === TRIGGER TEMPLATES ===
  {
    id: 'trigger-event',
    category: 'trigger',
    name: 'Event-Based Trigger',
    description: 'Initiates flow on webhook, API call, or system event',
    data: {
      nodeType: 'trigger',
      name: 'Event Trigger',
      triggerType: 'event',
      description: 'Triggered by external event (webhook, API call, file upload)',
      configuration: '',
    },
  },
  {
    id: 'trigger-scheduled',
    category: 'trigger',
    name: 'Scheduled Trigger',
    description: 'Initiates flow on schedule (cron, interval, daily)',
    data: {
      nodeType: 'trigger',
      name: 'Scheduled Trigger',
      triggerType: 'scheduled',
      description: 'Runs on a defined schedule',
      configuration: '',
    },
  },
  {
    id: 'trigger-manual',
    category: 'trigger',
    name: 'Manual Trigger',
    description: 'User-initiated start via button or form submission',
    data: {
      nodeType: 'trigger',
      name: 'Manual Trigger',
      triggerType: 'manual',
      description: 'Started manually by a user',
      configuration: '',
    },
  },

  // === AGENT TEMPLATES ===
  {
    id: 'agent-data-retrieval',
    category: 'agent',
    name: 'Data Retrieval Agent',
    description: 'Retrieves and consolidates data from source systems',
    data: {
      nodeType: 'work',
      name: 'Data Retrieval Agent',
      workerType: 'agent',
      goal: 'Retrieve and consolidate relevant data from source systems',
      inputs: [
        { name: 'Data query parameters', required: true },
        { name: 'Source system credentials', required: true },
      ],
      tasks: ['Connect to data sources', 'Execute queries', 'Consolidate results', 'Format output'],
      outputs: [
        { name: 'Consolidated dataset', required: true },
        { name: 'Data quality report', required: false },
      ],
      integrations: [
        {
          name: 'Database',
          action: 'Query and retrieve data from primary database',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'API',
          action: 'Call external APIs to retrieve additional data',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'agent-document-generation',
    category: 'agent',
    name: 'Document Generation Agent',
    description: 'Generates formatted documents from templates and data',
    data: {
      nodeType: 'work',
      name: 'Document Generation Agent',
      workerType: 'agent',
      goal: 'Generate formatted documents based on templates and input data',
      inputs: [
        { name: 'Template reference', required: true },
        { name: 'Data payload', required: true },
        { name: 'Formatting preferences', required: false },
      ],
      tasks: ['Load template', 'Populate with data', 'Apply formatting', 'Generate output'],
      outputs: [
        { name: 'Generated document', required: true },
        { name: 'Document metadata', required: false },
      ],
      integrations: [
        {
          name: 'Document management system',
          action: 'Store and manage generated documents',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Template library',
          action: 'Retrieve document templates for generation',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'agent-triage-routing',
    category: 'agent',
    name: 'Triage & Routing Agent',
    description: 'Classifies requests and routes to appropriate handlers',
    data: {
      nodeType: 'work',
      name: 'Triage & Routing Agent',
      workerType: 'agent',
      goal: 'Classify incoming requests and route to the appropriate handler',
      inputs: [
        { name: 'Request content', required: true },
        { name: 'Classification criteria', required: true },
        { name: 'Routing rules', required: true },
      ],
      tasks: ['Analyze request', 'Classify by type/priority', 'Determine handler', 'Route request'],
      outputs: [
        { name: 'Classification result', required: true },
        { name: 'Routing destination', required: true },
        { name: 'Confidence score', required: false },
      ],
      integrations: [
        {
          name: 'Ticketing system',
          action: 'Create and route tickets based on triage results',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Queue management',
          action: 'Manage and prioritize work queues',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'agent-validation',
    category: 'agent',
    name: 'Validation & Compliance Agent',
    description: 'Validates data against business rules and compliance requirements',
    data: {
      nodeType: 'work',
      name: 'Validation Agent',
      workerType: 'agent',
      goal: 'Validate data against business rules and compliance requirements',
      inputs: [
        { name: 'Data to validate', required: true },
        { name: 'Validation rules', required: true },
        { name: 'Compliance requirements', required: false },
      ],
      tasks: ['Apply validation rules', 'Check compliance', 'Flag violations', 'Generate report'],
      outputs: [
        { name: 'Validation result', required: true },
        { name: 'Violation list', required: false },
        { name: 'Compliance report', required: false },
      ],
      integrations: [
        {
          name: 'Rules engine',
          action: 'Execute validation rules against data',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Compliance database',
          action: 'Check compliance requirements and regulations',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'agent-communication',
    category: 'agent',
    name: 'Communication Agent',
    description: 'Composes and sends stakeholder communications',
    data: {
      nodeType: 'work',
      name: 'Communication Agent',
      workerType: 'agent',
      goal: 'Compose and send appropriate communications to stakeholders',
      inputs: [
        { name: 'Communication context', required: true },
        { name: 'Recipient list', required: true },
        { name: 'Template preferences', required: false },
      ],
      tasks: ['Draft message', 'Personalize content', 'Select channel', 'Send communication'],
      outputs: [
        { name: 'Sent message', required: true },
        { name: 'Delivery status', required: true },
        { name: 'Response tracking', required: false },
      ],
      integrations: [
        {
          name: 'Email service',
          action: 'Send email communications to recipients',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Messaging platform',
          action: 'Send messages through messaging channels',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'CRM',
          action: 'Log communications and update customer records',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },

  // === AUTOMATION TEMPLATES ===
  {
    id: 'automation-system-sync',
    category: 'automation',
    name: 'System Sync Automation',
    description: 'Synchronizes data between systems automatically',
    data: {
      nodeType: 'work',
      name: 'System Sync',
      workerType: 'automation',
      goal: 'Synchronize data between source and target systems',
      inputs: [
        { name: 'Source data', required: true },
        { name: 'Sync configuration', required: true },
        { name: 'Mapping rules', required: false },
      ],
      tasks: ['Extract from source', 'Transform data', 'Load to target', 'Log results'],
      outputs: [
        { name: 'Sync completion status', required: true },
        { name: 'Records processed', required: true },
        { name: 'Error log', required: false },
      ],
      integrations: [
        {
          name: 'Source system',
          action: 'Extract data from source system',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Target system',
          action: 'Load synchronized data to target system',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'automation-scheduled-report',
    category: 'automation',
    name: 'Scheduled Report Automation',
    description: 'Generates and distributes reports on schedule',
    data: {
      nodeType: 'work',
      name: 'Report Generator',
      workerType: 'automation',
      goal: 'Generate and distribute scheduled reports to stakeholders',
      inputs: [
        { name: 'Report parameters', required: true },
        { name: 'Data sources', required: true },
        { name: 'Distribution list', required: true },
      ],
      tasks: ['Query data', 'Generate report', 'Format output', 'Distribute to recipients'],
      outputs: [
        { name: 'Generated report', required: true },
        { name: 'Distribution confirmation', required: true },
      ],
      integrations: [
        {
          name: 'Reporting engine',
          action: 'Generate reports from data sources',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Email service',
          action: 'Distribute reports to stakeholders',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'File storage',
          action: 'Store generated reports for archival',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'automation-status-update',
    category: 'automation',
    name: 'Status Update Automation',
    description: 'Updates record status and propagates changes',
    data: {
      nodeType: 'work',
      name: 'Status Updater',
      workerType: 'automation',
      goal: 'Update record status and propagate changes to related systems',
      inputs: [
        { name: 'Record identifier', required: true },
        { name: 'New status', required: true },
        { name: 'Update context', required: false },
      ],
      tasks: ['Validate status transition', 'Update record', 'Propagate to systems', 'Send notifications'],
      outputs: [
        { name: 'Updated record', required: true },
        { name: 'Propagation status', required: true },
        { name: 'Notification log', required: false },
      ],
      integrations: [
        {
          name: 'Primary database',
          action: 'Update record status in primary database',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Related systems',
          action: 'Propagate status changes to related systems',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'automation-file-processing',
    category: 'automation',
    name: 'File Processing Automation',
    description: 'Processes files through ETL pipeline',
    data: {
      nodeType: 'work',
      name: 'File Processor',
      workerType: 'automation',
      goal: 'Process incoming files through extraction, transformation, and loading',
      inputs: [
        { name: 'Input file', required: true },
        { name: 'Processing rules', required: true },
        { name: 'Output configuration', required: false },
      ],
      tasks: ['Validate file format', 'Extract data', 'Transform data', 'Load to destination'],
      outputs: [
        { name: 'Processed data', required: true },
        { name: 'Processing log', required: false },
        { name: 'Validation results', required: false },
      ],
      integrations: [
        {
          name: 'File storage',
          action: 'Read input files and store processed output',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Data warehouse',
          action: 'Load processed data to data warehouse',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },

  // === HUMAN TEMPLATES ===
  {
    id: 'human-approval',
    category: 'human',
    name: 'Approval Gate',
    description: 'Human approval decision point',
    data: {
      nodeType: 'work',
      name: 'Approval Gate',
      workerType: 'human',
      goal: 'Review and approve or reject the submitted item',
      inputs: [
        { name: 'Item for review', required: true },
        { name: 'Approval criteria', required: true },
        { name: 'Supporting documentation', required: false },
      ],
      tasks: ['Review submission', 'Evaluate against criteria', 'Make approval decision', 'Provide feedback'],
      outputs: [
        { name: 'Approval decision', required: true },
        { name: 'Feedback/comments', required: false },
        { name: 'Decision timestamp', required: true },
      ],
      integrations: [
        {
          name: 'Approval workflow system',
          action: 'Route items for approval and track decisions',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Notification service',
          action: 'Send approval decision notifications',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'human-exception',
    category: 'human',
    name: 'Exception Handler',
    description: 'Resolves failed automated processing',
    data: {
      nodeType: 'work',
      name: 'Exception Handler',
      workerType: 'human',
      goal: 'Investigate and resolve exceptions from automated processing',
      inputs: [
        { name: 'Exception details', required: true },
        { name: 'Original request', required: true },
        { name: 'Error context', required: false },
      ],
      tasks: ['Review exception', 'Investigate root cause', 'Apply resolution', 'Document outcome'],
      outputs: [
        { name: 'Resolution action', required: true },
        { name: 'Updated record', required: true },
        { name: 'Root cause analysis', required: false },
      ],
      integrations: [
        {
          name: 'Case management',
          action: 'Track and manage exception cases',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Knowledge base',
          action: 'Document resolutions and best practices',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'human-quality-review',
    category: 'human',
    name: 'Quality Review',
    description: 'Reviews AI outputs before release',
    data: {
      nodeType: 'work',
      name: 'Quality Review',
      workerType: 'human',
      goal: 'Review and validate AI-generated outputs before release',
      inputs: [
        { name: 'AI output', required: true },
        { name: 'Quality criteria', required: true },
        { name: 'Original request', required: false },
      ],
      tasks: ['Review output accuracy', 'Check compliance', 'Edit if needed', 'Approve for release'],
      outputs: [
        { name: 'Reviewed output', required: true },
        { name: 'Quality score', required: false },
        { name: 'Edit log', required: false },
      ],
      integrations: [
        {
          name: 'Review platform',
          action: 'Access and review AI-generated content',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Content management',
          action: 'Store reviewed and approved content',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },
  {
    id: 'human-data-entry',
    category: 'human',
    name: 'Data Entry / Enrichment',
    description: 'Manual data entry or enrichment task',
    data: {
      nodeType: 'work',
      name: 'Data Entry',
      workerType: 'human',
      goal: 'Enter or enrich data that cannot be automatically captured',
      inputs: [
        { name: 'Data entry form', required: true },
        { name: 'Source documents', required: true },
        { name: 'Entry guidelines', required: false },
      ],
      tasks: ['Review source', 'Enter/update data', 'Validate entries', 'Submit for processing'],
      outputs: [
        { name: 'Entered data', required: true },
        { name: 'Entry completion status', required: true },
      ],
      integrations: [
        {
          name: 'Data entry system',
          action: 'Access forms and submit entered data',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
        {
          name: 'Document viewer',
          action: 'View source documents for data entry',
          inputs: [],
          outputs: [],
          apiEndpoints: [],
        },
      ],
    },
  },

  // === FLOW CONTROL TEMPLATES ===
  {
    id: 'flow-decision',
    category: 'flow',
    name: 'Decision Point',
    description: 'Branching logic based on conditions',
    data: {
      nodeType: 'decision',
      name: 'Decision',
      description: 'Evaluate condition and branch accordingly',
      conditions: [
        { id: 'condition-1', label: 'Yes', description: 'Condition is met' },
        { id: 'condition-2', label: 'No', description: 'Condition is not met' },
      ],
    },
  },
  {
    id: 'flow-end-success',
    category: 'flow',
    name: 'Success End',
    description: 'Successful process completion',
    data: {
      nodeType: 'end',
      name: 'Success',
      description: 'Process completed successfully',
      outcome: 'Process completed with expected results',
    },
  },
  {
    id: 'flow-end-failure',
    category: 'flow',
    name: 'Failure End',
    description: 'Process failure or error state',
    data: {
      nodeType: 'end',
      name: 'Failure',
      description: 'Process ended in error state',
      outcome: 'Process failed - requires investigation',
    },
  },

  // === WORKFLOW TEMPLATES ===
  {
    id: 'workflow-sub',
    category: 'workflow',
    name: 'Sub-Workflow',
    description: 'Call another workflow as a step in this process',
    data: {
      nodeType: 'workflow',
      name: 'Sub-Workflow',
      description: 'Executes a referenced workflow',
      workflowId: '',
      workflowName: '',
      inputs: [],
      outputs: [],
      version: '1.0',
    },
  },
  {
    id: 'workflow-validation',
    category: 'workflow',
    name: 'Validation Workflow',
    description: 'Call a reusable validation workflow',
    data: {
      nodeType: 'workflow',
      name: 'Validation Workflow',
      description: 'Runs a standardized validation process',
      workflowId: '',
      workflowName: 'Standard Validation',
      inputs: [
        { name: 'Data to validate', required: true },
        { name: 'Validation rules', required: false },
      ],
      outputs: [
        { name: 'Validation result', required: true },
        { name: 'Error details', required: false },
      ],
      version: '1.0',
    },
  },
  {
    id: 'workflow-approval',
    category: 'workflow',
    name: 'Approval Workflow',
    description: 'Call a reusable approval workflow',
    data: {
      nodeType: 'workflow',
      name: 'Approval Workflow',
      description: 'Runs a standardized approval process',
      workflowId: '',
      workflowName: 'Standard Approval',
      inputs: [
        { name: 'Item for approval', required: true },
        { name: 'Approver list', required: true },
        { name: 'Approval criteria', required: false },
      ],
      outputs: [
        { name: 'Approval decision', required: true },
        { name: 'Approver comments', required: false },
      ],
      version: '1.0',
    },
  },
  {
    id: 'workflow-notification',
    category: 'workflow',
    name: 'Notification Workflow',
    description: 'Call a reusable notification workflow',
    data: {
      nodeType: 'workflow',
      name: 'Notification Workflow',
      description: 'Sends notifications through multiple channels',
      workflowId: '',
      workflowName: 'Multi-Channel Notification',
      inputs: [
        { name: 'Recipients', required: true },
        { name: 'Message content', required: true },
        { name: 'Channel preferences', required: false },
      ],
      outputs: [
        { name: 'Delivery status', required: true },
        { name: 'Failed recipients', required: false },
      ],
      version: '1.0',
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'trigger', label: 'Triggers', color: 'emerald' },
  { id: 'agent', label: 'AI Agents', color: 'orange' },
  { id: 'automation', label: 'Automations', color: 'yellow' },
  { id: 'human', label: 'Human Tasks', color: 'blue' },
  { id: 'workflow', label: 'Workflows', color: 'purple' },
  { id: 'flow', label: 'Flow Control', color: 'gray' },
] as const;

export function getTemplatesByCategory(category: string): NodeTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}
