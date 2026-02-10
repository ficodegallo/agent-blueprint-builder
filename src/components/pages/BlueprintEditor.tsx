import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AppLayout } from '../layout/AppLayout';
import { Header } from '../layout/Header';
import { BlueprintCanvas } from '../canvas/BlueprintCanvas';
import { TemplatePanel } from '../panels/TemplatePanel';
import { DetailPanel } from '../panels/DetailPanel';
import { BlueprintHeader } from '../panels/BlueprintHeader';
import { ValidationPanel } from '../panels/ValidationPanel';
import { ExportDialog } from '../dialogs/ExportDialog';
import { ImportDialog } from '../dialogs/ImportDialog';
import { SaveLoadDialog } from '../dialogs/SaveLoadDialog';
import { SmartImportDialog, ApiKeySettings } from '../../features/smartImport';
import { useUIStore, useBlueprintStore, useNodesStore, useEdgesStore, useCommentsStore } from '../../store';
import { useBlueprintsLibraryStore } from '../../store/blueprintsLibraryStore';

function BlueprintEditorContent() {
  const { blueprintId } = useParams<{ blueprintId: string }>();
  const navigate = useNavigate();
  const isInitialized = useRef(false);

  const isDetailPanelOpen = useUIStore((state) => state.isDetailPanelOpen);
  const isTemplatePanelOpen = useUIStore((state) => state.isTemplatePanelOpen);

  const getBlueprint = useBlueprintsLibraryStore((state) => state.getBlueprint);
  const updateBlueprint = useBlueprintsLibraryStore((state) => state.updateBlueprint);

  const loadFromData = useBlueprintStore((state) => state.loadFromData);

  // Get individual fields to avoid object recreation
  const id = useBlueprintStore((state) => state.id);
  const title = useBlueprintStore((state) => state.title);
  const description = useBlueprintStore((state) => state.description);
  const impactedAudiences = useBlueprintStore((state) => state.impactedAudiences);
  const businessBenefits = useBlueprintStore((state) => state.businessBenefits);
  const clientContacts = useBlueprintStore((state) => state.clientContacts);
  const createdBy = useBlueprintStore((state) => state.createdBy);
  const lastModifiedBy = useBlueprintStore((state) => state.lastModifiedBy);
  const lastModifiedDate = useBlueprintStore((state) => state.lastModifiedDate);
  const version = useBlueprintStore((state) => state.version);
  const status = useBlueprintStore((state) => state.status);
  const changeLog = useBlueprintStore((state) => state.changeLog);

  const nodes = useNodesStore((state) => state.nodes);
  const setNodes = useNodesStore((state) => state.setNodes);
  const edges = useEdgesStore((state) => state.edges);
  const setEdges = useEdgesStore((state) => state.setEdges);
  const comments = useCommentsStore((state) => state.comments);
  const setComments = useCommentsStore((state) => state.setComments);

  // Load blueprint on mount
  useEffect(() => {
    if (!blueprintId) {
      navigate('/');
      return;
    }

    const blueprint = getBlueprint(blueprintId);
    if (!blueprint) {
      navigate('/');
      return;
    }

    // Load blueprint data into stores
    loadFromData({
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      impactedAudiences: blueprint.impactedAudiences,
      businessBenefits: blueprint.businessBenefits,
      clientContacts: blueprint.clientContacts,
      createdBy: blueprint.createdBy,
      lastModifiedBy: blueprint.lastModifiedBy,
      lastModifiedDate: blueprint.lastModifiedDate,
      version: blueprint.version,
      status: blueprint.status,
      changeLog: blueprint.changeLog,
    });

    // Load nodes with proper typing
    const appNodes = blueprint.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }));
    setNodes(appNodes);
    setEdges(blueprint.edges);
    setComments(blueprint.comments);

    // Mark as initialized after a short delay to avoid immediate save
    setTimeout(() => {
      isInitialized.current = true;
    }, 100);

    return () => {
      isInitialized.current = false;
    };
  }, [blueprintId]); // Only depend on blueprintId, not the functions

  // Create a stable save function
  const saveToLibrary = useCallback(() => {
    if (!blueprintId || !isInitialized.current) return;

    const serializedNodes = useNodesStore.getState().nodes.map((node) => ({
      id: node.id,
      type: node.type || node.data.nodeType,
      position: node.position,
      data: node.data,
    }));

    const currentEdges = useEdgesStore.getState().edges;
    const currentComments = useCommentsStore.getState().comments;
    const blueprintState = useBlueprintStore.getState();

    updateBlueprint(blueprintId, {
      id: blueprintState.id,
      title: blueprintState.title,
      description: blueprintState.description,
      impactedAudiences: blueprintState.impactedAudiences,
      businessBenefits: blueprintState.businessBenefits,
      clientContacts: blueprintState.clientContacts,
      createdBy: blueprintState.createdBy,
      lastModifiedBy: blueprintState.lastModifiedBy,
      lastModifiedDate: blueprintState.lastModifiedDate,
      version: blueprintState.version,
      status: blueprintState.status,
      changeLog: blueprintState.changeLog,
      nodes: serializedNodes,
      edges: currentEdges,
      comments: currentComments,
    });
  }, [blueprintId, updateBlueprint]);

  // Auto-save to library store with debounce
  useEffect(() => {
    if (!blueprintId || !isInitialized.current) return;

    const saveTimeout = setTimeout(saveToLibrary, 1000);
    return () => clearTimeout(saveTimeout);
  }, [blueprintId, saveToLibrary, id, title, description, impactedAudiences, businessBenefits,
      clientContacts, createdBy, lastModifiedBy, lastModifiedDate, version, status, changeLog,
      nodes, edges, comments]);

  return (
    <>
      <AppLayout
        header={<Header showBackButton />}
        subHeader={<BlueprintHeader />}
        leftPanel={isTemplatePanelOpen ? <TemplatePanel /> : undefined}
        canvas={<BlueprintCanvas />}
        rightPanel={isDetailPanelOpen ? <DetailPanel /> : undefined}
        footer={<ValidationPanel />}
      />
      <ExportDialog />
      <ImportDialog />
      <SaveLoadDialog />
      <SmartImportDialog />
      <ApiKeySettings />
    </>
  );
}

export function BlueprintEditor() {
  return (
    <ReactFlowProvider>
      <BlueprintEditorContent />
    </ReactFlowProvider>
  );
}
