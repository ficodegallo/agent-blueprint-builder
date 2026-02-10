import type { Status } from '../types';

export const STATUS_OPTIONS: { value: Status; label: string; description: string }[] = [
  {
    value: 'Draft',
    label: 'Draft',
    description: 'Blueprint is being designed and is not ready for review',
  },
  {
    value: 'In Review',
    label: 'In Review',
    description: 'Blueprint is being reviewed by stakeholders',
  },
  {
    value: 'Approved',
    label: 'Approved',
    description: 'Blueprint has been approved for implementation',
  },
  {
    value: 'Archived',
    label: 'Archived',
    description: 'Blueprint is no longer active',
  },
];

export const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  Draft: ['In Review', 'Archived'],
  'In Review': ['Draft', 'Approved', 'Archived'],
  Approved: ['In Review', 'Archived'],
  Archived: ['Draft'],
};

export function canTransitionTo(currentStatus: Status, newStatus: Status): boolean {
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}
