declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface UserOptions {
    startY?: number;
    head?: string[][];
    body?: string[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: {
      fillColor?: number[];
      fontSize?: number;
      fontStyle?: string;
    };
    bodyStyles?: {
      fontSize?: number;
    };
    columnStyles?: {
      [key: number]: {
        cellWidth?: number;
      };
    };
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}
