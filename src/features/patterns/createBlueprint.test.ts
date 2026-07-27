import { describe, it, expect } from 'vitest';
import { createBlueprintForPattern } from './createBlueprint';
import { scaffoldPattern } from './scaffolds';

describe('createBlueprintForPattern', () => {
  it('with a pattern, sets orchestrationPattern and seeds the scaffold', () => {
    const bp = createBlueprintForPattern('routing');
    expect(bp.orchestrationPattern).toBe('routing');
    expect(bp.nodes.length).toBe(scaffoldPattern('routing').nodes.length);
    expect(bp.nodes.some((n) => n.data.nodeType === 'router')).toBe(true);
    expect(bp.title).toContain('Routing');
    expect(bp.id).toBeTruthy();
  });

  it('with null, produces a blank blueprint with no pattern (parity with prior behavior)', () => {
    const bp = createBlueprintForPattern(null);
    expect(bp.orchestrationPattern).toBeUndefined();
    expect(bp.nodes).toEqual([]);
    expect(bp.edges).toEqual([]);
    expect(bp.title).toBe('Untitled Blueprint');
  });

  it('generates a unique id per blueprint', () => {
    const a = createBlueprintForPattern('pipeline');
    const b = createBlueprintForPattern('pipeline');
    expect(a.id).not.toBe(b.id);
  });
});
