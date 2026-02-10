import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintsLibraryStore } from '../../../store/blueprintsLibraryStore';
import { useBlueprintStore, useNodesStore, useEdgesStore, useCommentsStore } from '../../../store';
import {
  processFile,
  combineExtractedContent,
  isWithinTokenLimit,
} from '../utils/fileProcessors';
import { parseClaudeResponse } from '../utils/responseParser';
import { applyAutoLayout } from '../utils/autoLayout';
import { useClaudeApi } from './useClaudeApi';
import type {
  SmartImportState,
  SmartImportOptions,
  UploadedFile,
  GenerationStep,
} from '../types';
import { INITIAL_STATE, DEFAULT_OPTIONS } from '../types';

export function useSmartImport() {
  const [state, setState] = useState<SmartImportState>(INITIAL_STATE);

  const { callClaude } = useClaudeApi();
  const addBlueprint = useBlueprintsLibraryStore((state) => state.addBlueprint);
  const loadFromData = useBlueprintStore((state) => state.loadFromData);
  const setNodes = useNodesStore((state) => state.setNodes);
  const setEdges = useEdgesStore((state) => state.setEdges);
  const setComments = useCommentsStore((state) => state.setComments);

  // Update step progress
  const setStep = useCallback((step: GenerationStep, progress: number) => {
    setState((s) => ({ ...s, currentStep: step, stepProgress: progress }));
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setState((s) => ({ ...s, currentStep: 'error', error }));
  }, []);

  // Add files
  const addFiles = useCallback(async (newFiles: File[]) => {
    // Create uploaded file entries
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const,
    }));

    // Add to state
    setState((s) => ({
      ...s,
      files: [...s.files, ...uploadedFiles].slice(0, 5), // Max 5 files
      error: null,
    }));

    // Process each file
    for (const uploadedFile of uploadedFiles) {
      // Update status to processing
      setState((s) => ({
        ...s,
        files: s.files.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: 'processing' as const } : f
        ),
      }));

      // Process the file
      const result = await processFile(uploadedFile.file);

      // Update with result
      setState((s) => ({
        ...s,
        files: s.files.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: result.success ? ('success' as const) : ('error' as const),
                extractedText: result.text,
                error: result.error,
              }
            : f
        ),
      }));
    }
  }, []);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      files: s.files.filter((f) => f.id !== id),
      error: null,
    }));
  }, []);

  // Update options
  const updateOptions = useCallback((updates: Partial<SmartImportOptions>) => {
    setState((s) => ({
      ...s,
      options: { ...s.options, ...updates },
    }));
  }, []);

  // Main generation function
  const handleGenerate = useCallback(async () => {
    console.log('=== Starting blueprint generation ===');
    try {
      // Step 1: Read and combine documents
      console.log('Step 1: Reading documents');
      setStep('reading', 10);

      const successfulFiles = state.files.filter(
        (f) => f.status === 'success' && f.extractedText
      );

      console.log('Successful files:', successfulFiles.length);
      if (successfulFiles.length === 0) {
        console.error('No files with extracted text');
        setError('No files with extracted text available');
        return;
      }

      const combinedContent = combineExtractedContent(
        successfulFiles.map((f) => ({
          name: f.name,
          text: f.extractedText!,
        }))
      );

      console.log('Combined content length:', combinedContent.length);
      setStep('reading', 30);

      // Check token limits
      if (!isWithinTokenLimit(combinedContent)) {
        console.error('Content exceeds token limit');
        setError(
          'Combined document content is too large. Please remove some files or use smaller documents.'
        );
        return;
      }

      // Step 2: Analyze with Claude
      console.log('Step 2: Calling Claude API');
      setStep('analyzing', 40);

      const apiResponse = await Promise.race([
        callClaude(combinedContent, state.options, (msg) => {
          console.log('Claude progress:', msg);
        }),
        new Promise<{ success: false; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Generation timed out after 90 seconds. Please try with a shorter document or try again later.')), 90000)
        ),
      ]).catch((error) => ({
        success: false as const,
        error: error instanceof Error ? error.message : 'Request failed',
      }));

      console.log('API response received:', { success: apiResponse.success });
      if (!apiResponse.success || !apiResponse.content) {
        console.error('API call failed:', apiResponse.error);
        setError(apiResponse.error || 'Failed to get response from Claude');
        return;
      }

      console.log('Response content length:', apiResponse.content.length);
      setStep('generating', 70);

      // Step 3: Parse response
      console.log('Step 3: Parsing response');
      const parseResult = parseClaudeResponse(apiResponse.content);

      console.log('Parse result:', { success: parseResult.success, error: parseResult.error });
      if (!parseResult.success || !parseResult.blueprint) {
        console.error('Parse failed:', parseResult.error);
        console.log('Raw response:', apiResponse.content.substring(0, 500));
        setError(parseResult.error || 'Failed to parse Claude response');
        return;
      }

      console.log('Blueprint parsed successfully. Nodes:', parseResult.blueprint.nodes.length);

      // Step 4: Apply auto-layout
      console.log('Step 4: Applying layout');
      setStep('layouting', 85);

      let layoutedNodes;
      try {
        // Add timeout protection for layout calculation
        const layoutPromise = Promise.resolve(
          applyAutoLayout(
            parseResult.blueprint.nodes,
            parseResult.blueprint.edges
          )
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Layout calculation timed out')), 10000)
        );

        layoutedNodes = await Promise.race([layoutPromise, timeoutPromise]);
        console.log('Layout applied successfully. Positioned nodes:', layoutedNodes.length);
      } catch (layoutError) {
        console.error('Layout error, using fallback positions:', layoutError);
        // Use simple grid layout as fallback
        layoutedNodes = parseResult.blueprint.nodes.map((node, index) => ({
          ...node,
          position: {
            x: 100 + (index % 5) * 300,
            y: 100 + Math.floor(index / 5) * 200,
          },
        }));
        console.log('Using fallback grid layout for', layoutedNodes.length, 'nodes');
      }

      const finalBlueprint = {
        ...parseResult.blueprint,
        nodes: layoutedNodes,
      };

      // Step 5: Complete
      console.log('Step 5: Generation complete!');
      setStep('complete', 100);

      setState((s) => ({
        ...s,
        generatedBlueprint: finalBlueprint,
        currentStep: 'complete',
        stepProgress: 100,
      }));
    } catch (error) {
      console.error('=== Generation error ===', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    }
  }, [state.files, state.options, callClaude, setStep, setError]);

  // Load generated blueprint into the app
  const loadGeneratedBlueprint = useCallback(() => {
    if (!state.generatedBlueprint) return;

    const blueprint = state.generatedBlueprint;

    // Add to blueprints library
    addBlueprint(blueprint);

    // Load into current stores
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
  }, [state.generatedBlueprint, addBlueprint, loadFromData, setNodes, setEdges, setComments]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      options: { ...DEFAULT_OPTIONS },
    });
  }, []);

  return {
    state,
    addFiles,
    removeFile,
    updateOptions,
    handleGenerate,
    loadGeneratedBlueprint,
    reset,
  };
}
