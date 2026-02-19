import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getBestPracticesText } from '../utils/bestPracticesStorage';
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';
import type { ValidationIssue } from '../utils/validation';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60000;

function serializeBlueprintForAnalysis(nodes: AppNode[], edges: BlueprintEdge[]): string {
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

interface BPWarning {
  code: string;
  message: string;
  nodeId: string | null;
  nodeName: string | null;
}

export function useBestPracticesAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [warnings, setWarnings] = useState<ValidationIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeBestPractices = useCallback(async (nodes: AppNode[], edges: BlueprintEdge[]) => {
    const bestPracticesText = getBestPracticesText();
    if (!bestPracticesText.trim()) {
      setError('No best practices defined. Add them from the Home page.');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('API key not found. Please configure your Claude API key in Smart Import settings.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setWarnings([]);

    const blueprintText = serializeBlueprintForAnalysis(nodes, edges);

    const systemPrompt = `You are an expert workflow analyst. You will be given a blueprint description and a set of best practices. Analyze the blueprint for violations of these best practices.

Return ONLY a JSON array of violations found. Each violation should be an object with:
- "code": a string like "BP001", "BP002", etc. (sequential)
- "message": a clear description of the violation and which best practice it violates
- "nodeId": the node ID involved (string), or null if it's a blueprint-level issue
- "nodeName": the node name involved (string), or null if it's a blueprint-level issue

If no violations are found, return an empty array: []

Return ONLY the JSON array, no other text.`;

    const userPrompt = `## Best Practices
${bestPracticesText}

## Blueprint
${blueprintText}

Analyze this blueprint against the best practices above and return a JSON array of violations.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `API request failed: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No content in API response');
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as BPWarning[];

      const issues: ValidationIssue[] = parsed.map((w, i) => ({
        id: `bp-${i}-${w.nodeId || 'global'}`,
        severity: 'warning' as const,
        code: w.code || `BP${String(i + 1).padStart(3, '0')}`,
        message: w.message,
        nodeId: w.nodeId || undefined,
        nodeName: w.nodeName || undefined,
      }));

      setWarnings(issues);
      setIsAnalyzing(false);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : 'Failed to analyze best practices';
      setError(message);
      setIsAnalyzing(false);
    }
  }, []);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
    setError(null);
  }, []);

  return {
    analyzeBestPractices,
    isAnalyzing,
    warnings,
    error,
    clearWarnings,
  };
}
