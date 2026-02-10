import { v4 as uuidv4 } from 'uuid';
import type { Blueprint, BlueprintMetadata } from '../types';

export function createDefaultBlueprint(): Blueprint {
  return {
    id: uuidv4(),
    title: 'Untitled Blueprint',
    description: '',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: '',
    lastModifiedBy: '',
    lastModifiedDate: new Date().toISOString(),
    version: '1.0',
    status: 'Draft',
    changeLog: [],
    nodes: [],
    edges: [],
    comments: [],
  };
}

export function createDefaultMetadata(): BlueprintMetadata {
  return {
    id: uuidv4(),
    title: 'Untitled Blueprint',
    description: '',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: '',
    lastModifiedBy: '',
    lastModifiedDate: new Date().toISOString(),
    version: '1.0',
    status: 'Draft',
    changeLog: [],
  };
}
