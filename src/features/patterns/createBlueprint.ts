import { v4 as uuidv4 } from 'uuid';
import type { Blueprint } from '../../types';
import { scaffoldPattern } from './scaffolds';
import { getPattern } from './patterns';
import type { OrchestrationPatternId } from './types';

/**
 * Build a new blueprint for the manual creation path. With a pattern, the
 * blueprint carries `orchestrationPattern` and is seeded with that pattern's
 * scaffold; with `null`, it is a blank canvas (parity with the prior behavior).
 */
export function createBlueprintForPattern(patternId: OrchestrationPatternId | null): Blueprint {
  const id = uuidv4();
  const pattern = patternId ? getPattern(patternId) : undefined;
  const scaffold = pattern ? scaffoldPattern(pattern.id) : { nodes: [], edges: [] };

  return {
    id,
    title: pattern ? `Untitled ${pattern.name} Blueprint` : 'Untitled Blueprint',
    description: '',
    clientName: '',
    projectName: '',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: '',
    lastModifiedBy: '',
    lastModifiedDate: new Date().toISOString(),
    version: '1.0',
    status: 'Draft',
    changeLog: [],
    ...(pattern ? { orchestrationPattern: pattern.id } : {}),
    nodes: scaffold.nodes,
    edges: scaffold.edges,
    comments: [],
    parkingLot: [],
    evals: [],
  };
}
