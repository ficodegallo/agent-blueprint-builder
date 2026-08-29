import { describe, it, expect } from 'vitest';
import { serializeBlueprintForAnalysis, serializeBlueprintMetadata } from './blueprintSerializer';
import { BUILT_IN_EVAL_PRACTICES } from '../data/defaultEvalPractices';
import { EVAL_DIMENSIONS } from '../types';
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';

function node(id: string, data: Record<string, unknown>): AppNode {
  return {
    id,
    type: data.nodeType as string,
    position: { x: 0, y: 0 },
    data: data as AppNode['data'],
  };
}

describe('serializeBlueprintForAnalysis', () => {
  it('serializes a work-agent node with full agent spec and approval oversight', () => {
    const text = serializeBlueprintForAnalysis(
      [
        node('n1', {
          nodeType: 'work',
          name: 'Refund Agent',
          workerType: 'agent',
          goal: 'Issue approved refunds',
          inputs: [
            { name: 'claim', required: true },
            { name: 'notes', required: false },
          ],
          tasks: ['Validate claim', 'Issue refund'],
          outputs: [{ name: 'receipt', required: true }],
          integrations: ['Stripe', { name: 'Zendesk', action: 'log' }],
          description: 'Handles refunds under the approval threshold',
          skills: ['refund-policy'],
          tools: ['stripe.refund'],
          autonomyLevel: 'guided',
          guardrails: ['Never exceed $500'],
          successCriteria: ['Refund matches claim amount'],
          failureHandling: 'Escalate to a human',
          hitl: {
            mode: 'approval',
            reviewer: 'Finance',
            sla: '4h',
            samplingRate: '',
            escalationPath: 'Finance lead',
          },
        }),
      ],
      []
    );

    expect(text).toContain('Node [n1] "Refund Agent" (type: work)');
    expect(text).toContain('Worker type: agent');
    expect(text).toContain('Goal: Issue approved refunds');
    expect(text).toContain('Inputs: claim*, notes');
    expect(text).toContain('Tasks: Validate claim; Issue refund');
    expect(text).toContain('Outputs: receipt*');
    expect(text).toContain('Integrations: Stripe, Zendesk');
    expect(text).toContain('Agent description: Handles refunds under the approval threshold');
    expect(text).toContain('Skills: refund-policy');
    expect(text).toContain('Tools: stripe.refund');
    expect(text).toContain('Autonomy level: guided');
    expect(text).toContain('Guardrails: Never exceed $500');
    expect(text).toContain('Success criteria: Refund matches claim amount');
    expect(text).toContain('Failure handling: Escalate to a human');
    expect(text).toContain('Human oversight: approval by Finance, SLA 4h, escalation: Finance lead');
  });

  it('marks absent success criteria and guardrails so the model sees the gap', () => {
    const text = serializeBlueprintForAnalysis(
      [node('n1', { nodeType: 'work', name: 'Vague Agent', workerType: 'agent' })],
      []
    );

    expect(text).toContain('Success criteria: NOT DEFINED');
    expect(text).toContain('Guardrails: none defined');
  });

  it('reports a fully autonomous node and a gate with no escalation path', () => {
    const autonomous = serializeBlueprintForAnalysis(
      [node('n1', { nodeType: 'work', name: 'Auto', workerType: 'agent', hitl: { mode: 'none' } })],
      []
    );
    expect(autonomous).toContain('Human oversight: none (fully autonomous)');

    const noEscalation = serializeBlueprintForAnalysis(
      [
        node('n1', {
          nodeType: 'work',
          name: 'Gated',
          workerType: 'agent',
          hitl: { mode: 'approval', reviewer: '', sla: '', samplingRate: '', escalationPath: '' },
        }),
      ],
      []
    );
    expect(noEscalation).toContain('NO ESCALATION PATH');
  });

  it('serializes orchestrator fields including an undefined termination condition', () => {
    const text = serializeBlueprintForAnalysis(
      [
        node('n1', {
          nodeType: 'orchestrator',
          name: 'Manager',
          goal: 'Split the research',
          delegationStrategy: 'By topic',
          workers: [{ name: 'Researcher', description: 'Reads sources', skills: ['search'] }],
          synthesis: 'Merge findings',
        }),
      ],
      []
    );

    expect(text).toContain('Delegation strategy: By topic');
    expect(text).toContain('- Researcher: Reads sources (skills: search)');
    expect(text).toContain('Synthesis: Merge findings');
    expect(text).toContain('Termination condition: NOT DEFINED');
    expect(text).toContain('Max iterations: NOT DEFINED');
  });

  it('serializes an orchestrator with no workers defined', () => {
    const text = serializeBlueprintForAnalysis(
      [node('n1', { nodeType: 'orchestrator', name: 'Empty Manager' })],
      []
    );
    expect(text).toContain('Workers: none defined');
  });

  it('serializes agent loop, router, parallel and evaluator nodes with their gaps', () => {
    const text = serializeBlueprintForAnalysis(
      [
        node('n1', { nodeType: 'agentLoop', name: 'Loop', goal: 'Keep digging', memory: 'scratchpad' }),
        node('n2', {
          nodeType: 'router',
          name: 'Triage',
          description: 'Classify tickets',
          classifierInstructions: 'Read the subject line',
          routes: [
            { label: 'Billing', description: 'money questions' },
            { label: 'Tech', description: '' },
          ],
        }),
        node('n3', { nodeType: 'parallel', name: 'Split', mode: 'split', branches: [{ label: 'A' }, { label: 'B' }] }),
        node('n4', { nodeType: 'parallel', name: 'Join', mode: 'join', joinBehavior: 'wait-all' }),
        node('n5', {
          nodeType: 'evaluatorOptimizer',
          name: 'Polish',
          goal: 'Improve the draft',
          generatorDescription: 'Writes a draft',
        }),
      ],
      []
    );

    expect(text).toContain('Stop condition: NOT DEFINED');
    expect(text).toContain('Memory: scratchpad');
    expect(text).toContain('Classifier instructions: Read the subject line');
    expect(text).toContain('Routes: Billing (money questions); Tech (no description)');
    expect(text).toContain('Fallback route: NOT DEFINED');
    expect(text).toContain('Branches: A, B');
    expect(text).toContain('Join behavior: wait-all');
    expect(text).toContain('Generator: Writes a draft');
    expect(text).toContain('Evaluator criteria: NOT DEFINED');
    expect(text).toContain('Pass condition: NOT DEFINED');
    expect(text).toContain('On max iterations: NOT DEFINED');
  });

  it('serializes trigger, decision, end and workflow nodes', () => {
    const text = serializeBlueprintForAnalysis(
      [
        node('n1', { nodeType: 'trigger', name: 'Start', triggerType: 'event', description: 'Ticket created' }),
        node('n2', {
          nodeType: 'decision',
          name: 'Threshold',
          description: 'Over $500?',
          conditions: [{ label: 'Yes' }, { label: 'No' }],
        }),
        node('n3', { nodeType: 'end', name: 'Done', outcome: 'Refund issued' }),
        node('n4', { nodeType: 'workflow', name: 'Sub', workflowName: 'Approval Workflow' }),
      ],
      []
    );

    expect(text).toContain('Trigger type: event');
    expect(text).toContain('Description: Ticket created');
    expect(text).toContain('Branches: Yes, No');
    expect(text).toContain('Outcome: Refund issued');
    expect(text).toContain('Workflow: Approval Workflow');
  });

  it('serializes edges with and without labels', () => {
    const edges: BlueprintEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' } as BlueprintEdge,
      { id: 'e2', source: 'n2', target: 'n3', label: 'approved' } as BlueprintEdge,
    ];
    const text = serializeBlueprintForAnalysis([], edges);

    expect(text).toContain('n1 -> n2');
    expect(text).toContain('n2 -> n3 [approved]');
  });

  it('handles an empty blueprint without throwing', () => {
    const text = serializeBlueprintForAnalysis([], []);
    expect(text).toContain('Blueprint has 0 nodes and 0 connections.');
  });
});

describe('serializeBlueprintMetadata', () => {
  it('renders a set orchestration pattern by name', () => {
    const text = serializeBlueprintMetadata({
      title: 'Refund Triage',
      description: 'Route and settle refund requests',
      orchestrationPattern: 'routing',
      status: 'In Review',
      version: '2.0',
      impactedAudiences: ['Support', ''],
      businessBenefits: ['Faster resolution'],
    });

    expect(text).toContain('Title: Refund Triage');
    expect(text).toContain('Description: Route and settle refund requests');
    expect(text).toContain('Orchestration pattern: Routing');
    expect(text).toContain('Status: In Review');
    expect(text).toContain('Version: 2.0');
    expect(text).toContain('Impacted audiences: Support');
    expect(text).toContain('Business benefits: Faster resolution');
  });

  it('renders an unset pattern as Freeform and omits empty array fields', () => {
    const text = serializeBlueprintMetadata({ title: 'Bare' });

    expect(text).toContain('Orchestration pattern: Freeform');
    expect(text).toContain('Description: none given');
    expect(text).not.toContain('Impacted audiences:');
    expect(text).not.toContain('Business benefits:');
  });
});

describe('BUILT_IN_EVAL_PRACTICES', () => {
  it('names every eval dimension the generation prompt promises', () => {
    expect(BUILT_IN_EVAL_PRACTICES.length).toBeGreaterThan(0);
    for (const dimension of EVAL_DIMENSIONS) {
      expect(BUILT_IN_EVAL_PRACTICES).toContain(dimension);
    }
  });
});
