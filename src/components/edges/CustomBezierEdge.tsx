import { useCallback, useState, useRef } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { useEdgesStore } from '../../store';
import type { EdgeData } from '../../types';

/**
 * Custom edge component with right-angle paths (step/orthogonal).
 * Despite the name, this renders step edges with draggable horizontal line.
 * Name kept for backward compatibility with existing blueprints.
 */
export function CustomBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data = {},
  markerEnd,
  style = {},
}: EdgeProps) {
  const updateEdge = useEdgesStore((state) => state.updateEdge);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ offsetY: 0, startY: 0 });

  // Get control point offset from edge data (default to 0)
  const controlPointOffsetY = (data as EdgeData)?.controlPointOffsetY || 0;

  // Calculate the horizontal line position (midpoint + offset)
  const midX = (sourceX + targetX) / 2;
  const horizontalY = (sourceY + targetY) / 2 + controlPointOffsetY;

  // Create a step path with right angles
  // Path: Start -> vertical to horizontal line -> horizontal -> vertical to end
  const customPath = `
    M ${sourceX},${sourceY}
    L ${sourceX},${horizontalY}
    L ${targetX},${horizontalY}
    L ${targetX},${targetY}
  `;

  // Handle control point drag
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setIsDragging(true);

      // Store initial values
      dragStartRef.current = {
        offsetY: controlPointOffsetY,
        startY: event.clientY,
      };

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();

        // Calculate delta in screen space
        const deltaY = e.clientY - dragStartRef.current.startY;

        // Convert delta to flow space (approximate scale based on zoom)
        // We'll use a simple conversion - 1 screen pixel = ~1 flow unit at zoom 1
        const newOffset = dragStartRef.current.offsetY + deltaY;

        updateEdge(id as string, { controlPointOffsetY: newOffset });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, controlPointOffsetY, updateEdge]
  );

  // Reset control point on double-click
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      updateEdge(id as string, { controlPointOffsetY: 0 });
    },
    [id, updateEdge]
  );

  return (
    <>
      <BaseEdge
        path={customPath}
        markerEnd={markerEnd as string | undefined}
        style={style as React.CSSProperties | undefined}
      />

      {/* Control point handle - positioned on the horizontal line */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px,${horizontalY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            className={`
              w-3 h-3 rounded-full border-2 border-gray-400 bg-white cursor-ns-resize
              transition-all duration-200
              ${isDragging ? 'scale-150 border-blue-500 bg-blue-100' : 'hover:scale-125 hover:border-blue-400 hover:bg-blue-50'}
            `}
            title="Drag up/down to adjust path, double-click to reset"
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
