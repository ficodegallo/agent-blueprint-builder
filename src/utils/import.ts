import type { Blueprint, BlueprintExport, NodeData, SerializedNode } from '../types';

export interface ImportResult {
  success: boolean;
  blueprint?: Blueprint;
  error?: string;
}

// Validate the structure of imported data
function isValidNodeData(data: unknown): data is NodeData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.nodeType === 'string' &&
    typeof d.name === 'string' &&
    ['trigger', 'work', 'decision', 'end'].includes(d.nodeType as string)
  );
}

function isValidSerializedNode(node: unknown): node is SerializedNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.type === 'string' &&
    n.position !== null &&
    typeof n.position === 'object' &&
    isValidNodeData(n.data)
  );
}

function isValidBlueprint(blueprint: unknown): blueprint is Blueprint {
  if (!blueprint || typeof blueprint !== 'object') return false;
  const b = blueprint as Record<string, unknown>;

  // Required fields
  if (typeof b.id !== 'string') return false;
  if (typeof b.title !== 'string') return false;
  if (!Array.isArray(b.nodes)) return false;
  if (!Array.isArray(b.edges)) return false;

  // Validate nodes
  for (const node of b.nodes) {
    if (!isValidSerializedNode(node)) return false;
  }

  return true;
}

// Normalize edges to ensure they have the correct type and data structure
function normalizeEdges(blueprint: Blueprint): Blueprint {
  return {
    ...blueprint,
    edges: blueprint.edges.map((edge) => ({
      ...edge,
      // Ensure edge has customBezier type if not specified
      type: edge.type || 'customBezier',
      // Ensure edge data has controlPointOffsetY
      data: {
        ...edge.data,
        controlPointOffsetY: edge.data?.controlPointOffsetY ?? 0,
      },
    })),
  };
}

export function parseImportedJSON(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString);

    // Check if it's a BlueprintExport format
    if (parsed.version && parsed.blueprint) {
      const exportData = parsed as BlueprintExport;
      if (!isValidBlueprint(exportData.blueprint)) {
        return {
          success: false,
          error: 'Invalid blueprint structure in export file',
        };
      }
      return {
        success: true,
        blueprint: normalizeEdges(exportData.blueprint),
      };
    }

    // Check if it's a direct Blueprint format
    if (isValidBlueprint(parsed)) {
      return {
        success: true,
        blueprint: normalizeEdges(parsed),
      };
    }

    return {
      success: false,
      error: 'Unrecognized file format. Expected .blueprint.json file.',
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function importBlueprintFromFile(file: File): Promise<ImportResult> {
  try {
    const text = await readFileAsText(file);
    return parseImportedJSON(text);
  } catch (e) {
    return {
      success: false,
      error: `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}
