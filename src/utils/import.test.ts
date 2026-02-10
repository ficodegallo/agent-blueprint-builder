import { describe, it, expect } from 'vitest';
import { parseImportedJSON } from './import';
import type { Blueprint, BlueprintExport } from '../types';

// Helper to create a valid blueprint
function createValidBlueprint(): Blueprint {
  return {
    id: 'test-blueprint-id',
    title: 'Test Blueprint',
    description: 'A test blueprint',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: '',
    lastModifiedBy: '',
    lastModifiedDate: new Date().toISOString(),
    version: '1.0.0',
    status: 'Draft',
    changeLog: [],
    nodes: [
      {
        id: 'node1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'trigger',
          name: 'Start',
          triggerType: 'event',
          description: 'Start trigger',
          configuration: '',
        },
      },
      {
        id: 'node2',
        type: 'end',
        position: { x: 200, y: 0 },
        data: {
          nodeType: 'end',
          name: 'End',
          description: 'End state',
          outcome: 'Complete',
        },
      },
    ],
    edges: [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        type: 'default',
      },
    ],
    comments: [],
  };
}

describe('parseImportedJSON', () => {
  describe('Valid inputs', () => {
    it('should parse valid Blueprint format', () => {
      const blueprint = createValidBlueprint();
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(true);
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint?.title).toBe('Test Blueprint');
    });

    it('should parse valid BlueprintExport format', () => {
      const exportData: BlueprintExport = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        blueprint: createValidBlueprint(),
      };
      const jsonString = JSON.stringify(exportData);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(true);
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint?.title).toBe('Test Blueprint');
    });
  });

  describe('Invalid JSON', () => {
    it('should return error for invalid JSON syntax', () => {
      const result = parseImportedJSON('{ invalid json }');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse JSON');
    });

    it('should return error for empty string', () => {
      const result = parseImportedJSON('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Invalid blueprint structure', () => {
    it('should return error for missing id', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      delete blueprint.id;
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for missing title', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      delete blueprint.title;
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });

    it('should return error for missing nodes array', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      delete blueprint.nodes;
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });

    it('should return error for nodes not being an array', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      blueprint.nodes = 'not an array';
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });
  });

  describe('Invalid node structure', () => {
    it('should return error for node with invalid data', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      blueprint.nodes[0].data = { invalid: true };
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });

    it('should return error for node with missing nodeType', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      delete blueprint.nodes[0].data.nodeType;
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });

    it('should return error for node with invalid nodeType', () => {
      const blueprint = JSON.parse(JSON.stringify(createValidBlueprint()));
      blueprint.nodes[0].data.nodeType = 'invalid';
      const jsonString = JSON.stringify(blueprint);

      const result = parseImportedJSON(jsonString);

      expect(result.success).toBe(false);
    });
  });

  describe('Unrecognized format', () => {
    it('should return error for random object', () => {
      const result = parseImportedJSON('{"foo": "bar"}');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unrecognized file format');
    });

    it('should return error for array', () => {
      const result = parseImportedJSON('[1, 2, 3]');

      expect(result.success).toBe(false);
    });
  });
});
