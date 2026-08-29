/**
 * Shared blueprint serializers.
 *
 * `serializeBlueprintForAnalysis` renders the whole canvas — every node's
 * type-specific fields, agent spec, human-oversight policy, and the edge list —
 * as the text an AI feature reasons over. It is shared by the Best Practices
 * analysis and eval generation; a second copy would drift the moment a node
 * type gains a field, and drift here silently degrades both features.
 *
 * `NOT DEFINED` markers are deliberate: they give the model concrete gaps to
 * attack rather than silently omitting an absent field.
 */
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge, BlueprintMetadata } from '../types';
import { getPattern } from '../features/patterns/patterns';

// Shared agent-spec fields present on work/orchestrator/agentLoop/evaluator nodes
export function serializeAgentSpec(d: Record<string, unknown>, lines: string[]): void {
  const spec = d as {
    description?: string;
    skills?: string[];
    tools?: string[];
    autonomyLevel?: string;
    guardrails?: string[];
    successCriteria?: string[];
    stopCondition?: string;
    failureHandling?: string;
    hitl?: { mode: string; reviewer: string; sla: string; samplingRate: string; escalationPath: string };
  };
  if (spec.description) lines.push(`  Agent description: ${spec.description}`);
  if (spec.skills?.length) lines.push(`  Skills: ${spec.skills.join(', ')}`);
  if (spec.tools?.length) lines.push(`  Tools: ${spec.tools.join(', ')}`);
  if (spec.autonomyLevel) lines.push(`  Autonomy level: ${spec.autonomyLevel}`);
  lines.push(`  Guardrails: ${spec.guardrails?.length ? spec.guardrails.join('; ') : 'none defined'}`);
  lines.push(`  Success criteria: ${spec.successCriteria?.length ? spec.successCriteria.join('; ') : 'NOT DEFINED'}`);
  if (spec.failureHandling) lines.push(`  Failure handling: ${spec.failureHandling}`);
  if (spec.hitl && spec.hitl.mode !== 'none') {
    const h = spec.hitl;
    lines.push(
      `  Human oversight: ${h.mode}${h.reviewer ? ` by ${h.reviewer}` : ''}${h.sla ? `, SLA ${h.sla}` : ''}${h.samplingRate ? `, sampling ${h.samplingRate}` : ''}${h.escalationPath ? `, escalation: ${h.escalationPath}` : ', NO ESCALATION PATH'}`
    );
  } else {
    lines.push('  Human oversight: none (fully autonomous)');
  }
}

export function serializeBlueprintForAnalysis(nodes: AppNode[], edges: BlueprintEdge[]): string {
  const lines: string[] = [];

  lines.push(`Blueprint has ${nodes.length} nodes and ${edges.length} connections.\n`);

  for (const node of nodes) {
    const d = node.data;
    lines.push(`Node [${node.id}] "${d.name}" (type: ${d.nodeType})`);

    if (d.nodeType === 'work') {
      lines.push(`  Worker type: ${d.workerType}`);
      if (d.goal) lines.push(`  Goal: ${d.goal}`);
      if (d.inputs?.length) lines.push(`  Inputs: ${d.inputs.map((i) => `${i.name}${i.required ? '*' : ''}`).join(', ')}`);
      if (d.tasks?.length) lines.push(`  Tasks: ${d.tasks.join('; ')}`);
      if (d.outputs?.length) lines.push(`  Outputs: ${d.outputs.map((o) => `${o.name}${o.required ? '*' : ''}`).join(', ')}`);
      if (d.integrations?.length) {
        const names = d.integrations.map((ig) => (typeof ig === 'string' ? ig : ig.name)).join(', ');
        lines.push(`  Integrations: ${names}`);
      }
      serializeAgentSpec(d, lines);
    } else if (d.nodeType === 'orchestrator') {
      if (d.goal) lines.push(`  Goal: ${d.goal}`);
      if (d.delegationStrategy) lines.push(`  Delegation strategy: ${d.delegationStrategy}`);
      if (d.workers?.length) {
        lines.push(`  Workers:`);
        for (const w of d.workers) {
          lines.push(`    - ${w.name}: ${w.description}${w.skills?.length ? ` (skills: ${w.skills.join(', ')})` : ''}`);
        }
      } else {
        lines.push('  Workers: none defined');
      }
      if (d.synthesis) lines.push(`  Synthesis: ${d.synthesis}`);
      lines.push(`  Termination condition: ${d.terminationCondition || 'NOT DEFINED'}`);
      lines.push(`  Max iterations: ${d.maxIterations || 'NOT DEFINED'}`);
      if (d.budget) lines.push(`  Budget: ${d.budget}`);
      serializeAgentSpec(d, lines);
    } else if (d.nodeType === 'agentLoop') {
      if (d.goal) lines.push(`  Goal: ${d.goal}`);
      lines.push(`  Stop condition: ${d.stopCondition || 'NOT DEFINED'}`);
      lines.push(`  Max iterations: ${d.maxIterations || 'NOT DEFINED'}`);
      if (d.memory) lines.push(`  Memory: ${d.memory}`);
      if (d.integrations?.length) {
        const names = d.integrations.map((ig) => (typeof ig === 'string' ? ig : ig.name)).join(', ');
        lines.push(`  Integrations: ${names}`);
      }
      serializeAgentSpec(d, lines);
    } else if (d.nodeType === 'router') {
      if (d.description) lines.push(`  Description: ${d.description}`);
      if (d.classifierInstructions) lines.push(`  Classifier instructions: ${d.classifierInstructions}`);
      if (d.routes?.length) {
        lines.push(`  Routes: ${d.routes.map((r) => `${r.label} (${r.description || 'no description'})`).join('; ')}`);
      }
      lines.push(`  Fallback route: ${d.fallbackRoute || 'NOT DEFINED'}`);
    } else if (d.nodeType === 'parallel') {
      lines.push(`  Mode: ${d.mode}`);
      if (d.mode === 'split' && d.branches?.length) {
        lines.push(`  Branches: ${d.branches.map((b) => b.label).join(', ')}`);
      }
      if (d.mode === 'join') lines.push(`  Join behavior: ${d.joinBehavior}`);
    } else if (d.nodeType === 'evaluatorOptimizer') {
      if (d.goal) lines.push(`  Goal: ${d.goal}`);
      if (d.generatorDescription) lines.push(`  Generator: ${d.generatorDescription}`);
      lines.push(`  Evaluator criteria: ${d.evaluatorCriteria?.length ? d.evaluatorCriteria.join('; ') : 'NOT DEFINED'}`);
      lines.push(`  Pass condition: ${d.passCondition || 'NOT DEFINED'}`);
      lines.push(`  Max iterations: ${d.maxIterations || 'NOT DEFINED'}`);
      lines.push(`  On max iterations: ${d.onMaxIterations || 'NOT DEFINED'}`);
      serializeAgentSpec(d, lines);
    } else if (d.nodeType === 'trigger') {
      lines.push(`  Trigger type: ${d.triggerType}`);
      if (d.description) lines.push(`  Description: ${d.description}`);
    } else if (d.nodeType === 'decision') {
      if (d.description) lines.push(`  Description: ${d.description}`);
      if (d.conditions?.length) lines.push(`  Branches: ${d.conditions.map((c) => c.label).join(', ')}`);
    } else if (d.nodeType === 'end') {
      if (d.outcome) lines.push(`  Outcome: ${d.outcome}`);
    } else if (d.nodeType === 'workflow') {
      if (d.workflowName) lines.push(`  Workflow: ${d.workflowName}`);
    }
    lines.push('');
  }

  lines.push('Connections:');
  for (const edge of edges) {
    const label = edge.label ? ` [${edge.label}]` : '';
    lines.push(`  ${edge.source} -> ${edge.target}${label}`);
  }

  return lines.join('\n');
}

/**
 * Blueprint-level context — the goal and framing the nodes serve. Companion to
 * serializeBlueprintForAnalysis, which covers the graph itself.
 */
export function serializeBlueprintMetadata(metadata: Partial<BlueprintMetadata>): string {
  const lines: string[] = [];

  lines.push(`Title: ${metadata.title || 'Untitled Blueprint'}`);
  lines.push(`Description: ${metadata.description || 'none given'}`);
  lines.push(
    `Orchestration pattern: ${getPattern(metadata.orchestrationPattern)?.name ?? 'Freeform'}`
  );
  lines.push(`Status: ${metadata.status || 'Draft'}`);
  lines.push(`Version: ${metadata.version || '1.0'}`);

  if (metadata.impactedAudiences?.length) {
    lines.push(`Impacted audiences: ${metadata.impactedAudiences.filter(Boolean).join(', ')}`);
  }
  if (metadata.businessBenefits?.length) {
    lines.push(`Business benefits: ${metadata.businessBenefits.filter(Boolean).join('; ')}`);
  }

  return lines.join('\n');
}
