import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useNodesStore, useEdgesStore, useUIStore } from '../../store';
import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import type { NodeData } from '../../types';

export function BlueprintCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const { screenToFlowPosition, setCenter, getZoom } = useReactFlow();

  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);
  const onNodesChange = useNodesStore((state) => state.onNodesChange);
  const onEdgesChange = useEdgesStore((state) => state.onEdgesChange);
  const onConnect = useEdgesStore((state) => state.onConnect);
  const addNode = useNodesStore((state) => state.addNode);
  const selectNode = useUIStore((state) => state.selectNode);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const jsonData = event.dataTransfer.getData('application/json');
      if (!jsonData) return;

      try {
        const nodeData = JSON.parse(jsonData) as NodeData;

        // Get the position where the node was dropped
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNodeId = addNode(nodeData, position);
        selectNode(newNodeId);
      } catch (e) {
        console.error('Failed to parse dropped node data:', e);
      }
    },
    [screenToFlowPosition, addNode, selectNode]
  );

  // Auto-center on first trigger node when blueprint loads
  useEffect(() => {
    // Only run once when nodes are first loaded
    if (nodes.length > 0 && !hasInitialized.current) {
      // Find the first trigger node
      const firstTrigger = nodes.find((node) => node.data.nodeType === 'trigger');

      if (firstTrigger) {
        // Wait a bit for React Flow to fully initialize
        setTimeout(() => {
          const zoom = getZoom();
          setCenter(
            firstTrigger.position.x + 150, // Add half node width for centering
            firstTrigger.position.y + 75,  // Add half node height for centering
            { zoom, duration: 800 }         // Smooth animation to the trigger
          );
          hasInitialized.current = true;
        }, 100);
      } else {
        hasInitialized.current = true;
      }
    }
  }, [nodes, setCenter, getZoom]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'customBezier',
          animated: true,
        }}
        className="bg-gray-50"
      >
      <Background gap={15} size={1} color="#e5e7eb" />
      <Controls className="bg-white shadow-md rounded-lg border border-gray-200" />
      <MiniMap
        className="bg-white shadow-md rounded-lg border border-gray-200"
        pannable
        zoomable
        nodeColor={(node) => {
          switch (node.type) {
            case 'trigger':
              return '#10b981';
            case 'work':
              return '#3b82f6';
            case 'decision':
              return '#f59e0b';
            case 'end':
              return '#ef4444';
            case 'workflow':
              return '#a855f7';
            default:
              return '#6b7280';
          }
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
      />
    </ReactFlow>
    </div>
  );
}
