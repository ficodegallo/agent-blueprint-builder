export type ParkingLotStatus = 'Open' | 'In Discussion' | 'Awaiting Decision' | 'Blocked' | 'Resolved';

export interface ParkingLotItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: ParkingLotStatus;
  resolution: string;
  linkedNodeId: string | null;  // null = Blueprint Overall
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export const PARKING_LOT_STATUS_COLORS: Record<ParkingLotStatus, { bg: string; text: string }> = {
  'Open': { bg: 'bg-gray-200', text: 'text-gray-700' },
  'In Discussion': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Awaiting Decision': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Blocked': { bg: 'bg-red-100', text: 'text-red-700' },
  'Resolved': { bg: 'bg-green-100', text: 'text-green-700' },
};
