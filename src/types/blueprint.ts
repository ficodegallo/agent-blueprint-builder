export type Status = 'Draft' | 'In Review' | 'Approved' | 'Archived';

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  author: string;
  description: string;
}

export interface BlueprintMetadata {
  id: string;
  title: string;
  description: string;
  impactedAudiences: string[];
  businessBenefits: string[];
  clientContacts: string[];
  createdBy: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
  version: string;
  status: Status;
  changeLog: ChangeLogEntry[];
}

// SerializedNode is the JSON format for nodes (without React Flow internal state)
export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: import('./nodes').NodeData;
}

export interface Blueprint extends BlueprintMetadata {
  nodes: SerializedNode[];
  edges: import('./edges').BlueprintEdge[];
  comments: import('./comments').Comment[];
}

export interface BlueprintExport {
  version: string;
  exportedAt: string;
  blueprint: Blueprint;
}
