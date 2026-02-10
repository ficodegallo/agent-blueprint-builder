import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { SMART_IMPORT_CONFIG } from '../constants';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ProcessedFile {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Read a text file (.txt or .md)
 */
async function readTextFile(file: File): Promise<ProcessedFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ success: true, text: reader.result });
      } else {
        resolve({ success: false, error: 'Failed to read file as text' });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: reader.error?.message || 'Failed to read file' });
    };

    reader.readAsText(file);
  });
}

/**
 * Read a Word document (.docx)
 */
async function readDocxFile(file: File): Promise<ProcessedFile> {
  try {
    console.log('Processing Word document:', file.name, 'Size:', file.size);
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('Mammoth result:', {
      hasValue: !!result.value,
      valueLength: result.value?.length,
      messages: result.messages
    });

    if (result.value && result.value.trim().length > 0) {
      console.log('Successfully extracted text from Word document');
      return { success: true, text: result.value };
    } else {
      console.error('No text content found in Word document');
      return { success: false, error: 'No text content found in document' };
    }
  } catch (error) {
    console.error('Error processing Word document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Word document',
    };
  }
}

/**
 * Read a PDF file (.pdf)
 */
async function readPdfFile(file: File): Promise<ProcessedFile> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    }

    const fullText = textParts.join('\n\n');

    if (fullText.trim()) {
      return { success: true, text: fullText };
    } else {
      return { success: false, error: 'No text content found in PDF' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse PDF',
    };
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validate file type
 */
export function isValidFileType(file: File): boolean {
  const extension = getFileExtension(file.name);
  return (SMART_IMPORT_CONFIG.SUPPORTED_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= SMART_IMPORT_CONFIG.MAX_FILE_SIZE_BYTES;
}

/**
 * Process a single file and extract text
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  // Validate file type
  if (!isValidFileType(file)) {
    return {
      success: false,
      error: `Unsupported file type: ${getFileExtension(file.name)}`,
    };
  }

  // Validate file size
  if (!isValidFileSize(file)) {
    return {
      success: false,
      error: `File exceeds ${SMART_IMPORT_CONFIG.MAX_FILE_SIZE_MB}MB limit`,
    };
  }

  const extension = getFileExtension(file.name);

  switch (extension) {
    case '.txt':
    case '.md':
      return readTextFile(file);

    case '.docx':
      return readDocxFile(file);

    case '.pdf':
      return readPdfFile(file);

    default:
      return {
        success: false,
        error: `Unsupported file type: ${extension}`,
      };
  }
}

/**
 * Combine extracted text from multiple files with source attribution
 */
export function combineExtractedContent(
  files: Array<{ name: string; text: string }>
): string {
  if (files.length === 0) return '';

  if (files.length === 1) {
    return `## Source: ${files[0].name}\n\n${files[0].text}`;
  }

  return files
    .map((file, index) => `## Source ${index + 1}: ${file.name}\n\n${file.text}`)
    .join('\n\n---\n\n');
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / SMART_IMPORT_CONFIG.CHARS_PER_TOKEN);
}

/**
 * Check if combined content is within token limits
 */
export function isWithinTokenLimit(text: string): boolean {
  return estimateTokenCount(text) < SMART_IMPORT_CONFIG.MAX_INPUT_TOKENS;
}
