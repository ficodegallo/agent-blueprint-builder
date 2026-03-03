interface ParkingLotBadgeProps {
  count: number;
  onClick: () => void;
}

export function ParkingLotBadge({ count, onClick }: ParkingLotBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute -top-2 -left-2 z-10 flex items-center justify-center w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full shadow-sm hover:bg-amber-600 transition-colors"
      title={`${count} open parking lot item${count > 1 ? 's' : ''}`}
    >
      {count}
    </button>
  );
}
