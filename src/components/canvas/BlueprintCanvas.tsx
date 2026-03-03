import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeMouseHandler,
  type NodeChange,
} from '@xyflow/react';
import { useNodesStore, useEdgesStore, useUIStore } from '../../store';
import type { AppNode } from '../../store/nodesStore';
import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import type { NodeData } from '../../types';

export function BlueprintCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const { screenToFlowPosition, setCenter, getZoom } = useReactFlow();

  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);
  const applyNodesChange = useNodesStore((state) => state.onNodesChange);
  const onEdgesChange = useEdgesStore((state) => state.onEdgesChange);
  const onConnect = useEdgesStore((state) => state.onConnect);
  const addNode = useNodesStore((state) => state.addNode);
  const selectNode = useUIStore((state) => state.selectNode);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<{ nodeNames: string[]; changes: NodeChange<AppNode>[] } | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      const removeChanges = changes.filter((c) => c.type === 'remove');
      const otherChanges = changes.filter((c) => c.type !== 'remove');

      // Apply non-delete changes immediately
      if (otherChanges.length > 0) {
        applyNodesChange(otherChanges);
      }

      // Intercept deletes with confirmation
      if (removeChanges.length > 0) {
        const nodeNames = removeChanges.map((c) => {
          const node = nodes.find((n) => n.id === c.id);
          return (node?.data.name as string) || c.id;
        });
        setPendingDelete({ nodeNames, changes: removeChanges });
      }
    },
    [applyNodesChange, nodes]
  );

  const confirmDelete = useCallback(() => {
    if (pendingDelete) {
      applyNodesChange(pendingDelete.changes);
      selectNode(null);
    }
    setPendingDelete(null);
  }, [pendingDelete, applyNodesChange, selectNode]);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

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

  // Focus on a specific node when requested from validation panel
  const focusNodeId = useUIStore((state) => state.focusNodeId);

  useEffect(() => {
    if (!focusNodeId) return;

    const targetNode = nodes.find((node) => node.id === focusNodeId);
    if (targetNode) {
      const zoom = getZoom();
      setCenter(
        targetNode.position.x + 150,
        targetNode.position.y + 75,
        { zoom, duration: 800 }
      );
    }

    // Clear focusNodeId after centering so it can be triggered again for the same node
    useUIStore.setState({ focusNodeId: null });
  }, [focusNodeId, nodes, setCenter, getZoom]);

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

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30" onClick={cancelDelete} />
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Node{pendingDelete.nodeNames.length > 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-900">
                {pendingDelete.nodeNames.join(', ')}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
