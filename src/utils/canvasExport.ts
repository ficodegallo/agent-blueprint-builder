import html2canvas from 'html2canvas';

/**
 * Captures the React Flow canvas as a PNG image data URL
 * @returns Promise that resolves to the image data URL or null if capture fails
 */
export async function captureCanvas(): Promise<string | null> {
  try {
    // Find the React Flow viewport element
    const reactFlowElement = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (!reactFlowElement) {
      console.error('React Flow viewport not found');
      return null;
    }

    // Get the parent container for proper sizing
    const container = document.querySelector('.react-flow') as HTMLElement;
    if (!container) {
      console.error('React Flow container not found');
      return null;
    }

    // Capture the canvas with high quality settings
    const canvas = await html2canvas(reactFlowElement, {
      backgroundColor: '#f9fafb', // gray-50 background
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Convert to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture canvas:', error);
    return null;
  }
}

/**
 * Captures the entire React Flow canvas including all nodes
 * This version captures the full flow, not just the viewport
 */
export async function captureFullCanvas(): Promise<string | null> {
  try {
    // Find the React Flow container
    const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;

    if (!reactFlowElement) {
      console.error('React Flow element not found');
      return null;
    }

    // Capture the entire canvas
    const canvas = await html2canvas(reactFlowElement, {
      backgroundColor: '#f9fafb',
      scale: 1.5, // Good balance between quality and file size
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: reactFlowElement.scrollWidth,
      height: reactFlowElement.scrollHeight,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture full canvas:', error);
    return null;
  }
}
