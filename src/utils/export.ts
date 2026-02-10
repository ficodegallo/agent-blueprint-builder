import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Blueprint, BlueprintExport, SerializedNode } from '../types';
import type { AppNode } from '../store/nodesStore';
import { migrateIntegrations } from '../types/nodes';

// Serialize nodes for export
export function serializeNodesForExport(nodes: AppNode[]): SerializedNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type || node.data.nodeType,
    position: node.position,
    data: node.data,
  }));
}

// Export to JSON format
export function exportToJSON(blueprint: Blueprint): string {
  const exportData: BlueprintExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    blueprint,
  };
  return JSON.stringify(exportData, null, 2);
}

// Download JSON file
export function downloadJSON(blueprint: Blueprint, filename?: string) {
  const jsonString = exportToJSON(blueprint);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeName = (blueprint.title || 'blueprint')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  link.href = url;
  link.download = filename || `${safeName}-v${blueprint.version}.blueprint.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export to Excel format
export function exportToExcel(blueprint: Blueprint, filename?: string) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Metadata
  const metadataData = [
    ['Field', 'Value'],
    ['Title', blueprint.title],
    ['Description', blueprint.description],
    ['Version', blueprint.version],
    ['Status', blueprint.status],
    ['Created By', blueprint.createdBy],
    ['Last Modified By', blueprint.lastModifiedBy],
    ['Last Modified Date', blueprint.lastModifiedDate],
    ['Impacted Audiences', blueprint.impactedAudiences.join('; ')],
    ['Business Benefits', blueprint.businessBenefits.join('; ')],
    ['Client Contacts', blueprint.clientContacts.join('; ')],
  ];
  const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

  // Sheet 2: Nodes
  const nodesData = [
    ['Node ID', 'Name', 'Type', 'Sub-Type', 'Goal/Description', 'Inputs', 'Tasks', 'Outputs', 'Integrations', 'Position X', 'Position Y'],
  ];

  blueprint.nodes.forEach((node) => {
    const data = node.data;
    let subType = '';
    let goalDesc = '';
    let inputs = '';
    let tasks = '';
    let outputs = '';
    let integrations = '';

    if (data.nodeType === 'trigger') {
      subType = data.triggerType;
      goalDesc = data.description;
    } else if (data.nodeType === 'work') {
      subType = data.workerType;
      goalDesc = data.goal;
      inputs = data.inputs.map((i) => `${i.name}${i.required ? ' (Required)' : ' (Optional)'}`).join('; ');
      tasks = data.tasks.join('; ');
      outputs = data.outputs.map((o) => `${o.name}${o.required ? ' (Required)' : ' (Optional)'}`).join('; ');
      const integrationsDetails = migrateIntegrations(data.integrations);
      integrations = integrationsDetails
        .map((int) => `${int.name}${int.action ? ': ' + int.action : ''}`)
        .join('; ');
    } else if (data.nodeType === 'decision') {
      goalDesc = data.description;
    } else if (data.nodeType === 'end') {
      goalDesc = data.outcome;
    } else if (data.nodeType === 'workflow') {
      subType = data.workflowName || 'Sub-Workflow';
      goalDesc = data.description;
      inputs = data.inputs.map((i) => `${i.name}${i.required ? ' (Required)' : ' (Optional)'}`).join('; ');
      outputs = data.outputs.map((o) => `${o.name}${o.required ? ' (Required)' : ' (Optional)'}`).join('; ');
      integrations = `Workflow ID: ${data.workflowId || 'Not specified'} (v${data.version})`;
    }

    nodesData.push([
      node.id,
      data.name,
      data.nodeType,
      subType,
      goalDesc,
      inputs,
      tasks,
      outputs,
      integrations,
      String(node.position.x),
      String(node.position.y),
    ]);
  });

  const nodesSheet = XLSX.utils.aoa_to_sheet(nodesData);
  XLSX.utils.book_append_sheet(workbook, nodesSheet, 'Nodes');

  // Sheet 3: Connections
  const connectionsData = [
    ['Connection ID', 'Source Node ID', 'Target Node ID', 'Condition Label', 'Description'],
  ];

  blueprint.edges.forEach((edge) => {
    connectionsData.push([
      edge.id,
      edge.source,
      edge.target,
      edge.data?.conditionLabel || '',
      edge.data?.description || '',
    ]);
  });

  const connectionsSheet = XLSX.utils.aoa_to_sheet(connectionsData);
  XLSX.utils.book_append_sheet(workbook, connectionsSheet, 'Connections');

  // Sheet 4: Integration Details (for Work nodes)
  const integrationDetailsData = [
    ['Node ID', 'Node Name', 'Integration Name', 'Action', 'Input Mappings', 'Output Mappings', 'API Endpoints'],
  ];

  blueprint.nodes.forEach((node) => {
    if (node.data.nodeType === 'work') {
      const integrations = migrateIntegrations(node.data.integrations);
      integrations.forEach((integration) => {
        const inputMappings = integration.inputs
          .map((inp) => `${inp.description} -> ${inp.databaseField}`)
          .join('; ');
        const outputMappings = integration.outputs
          .map((out) => `${out.description} -> ${out.databaseField}`)
          .join('; ');
        const endpoints = integration.apiEndpoints
          .map((ep) => `${ep.method} ${ep.url}`)
          .join('; ');

        integrationDetailsData.push([
          node.id,
          node.data.name,
          integration.name,
          integration.action,
          inputMappings || '(none)',
          outputMappings || '(none)',
          endpoints || '(none)',
        ]);
      });
    }
  });

  if (integrationDetailsData.length > 1) {
    const integrationDetailsSheet = XLSX.utils.aoa_to_sheet(integrationDetailsData);
    XLSX.utils.book_append_sheet(workbook, integrationDetailsSheet, 'Integration Details');
  }

  // Sheet 5: Comments (if any)
  if (blueprint.comments && blueprint.comments.length > 0) {
    const commentsData = [
      ['Comment ID', 'Node ID', 'Author', 'Timestamp', 'Text', 'Resolved'],
    ];

    blueprint.comments.forEach((comment) => {
      commentsData.push([
        comment.id,
        comment.nodeId,
        comment.author,
        comment.timestamp,
        comment.text,
        comment.resolved ? 'Yes' : 'No',
      ]);
    });

    const commentsSheet = XLSX.utils.aoa_to_sheet(commentsData);
    XLSX.utils.book_append_sheet(workbook, commentsSheet, 'Comments');
  }

  // Sheet 6: Change Log (if any)
  if (blueprint.changeLog && blueprint.changeLog.length > 0) {
    const changeLogData = [
      ['Entry ID', 'Timestamp', 'Author', 'Description'],
    ];

    blueprint.changeLog.forEach((entry) => {
      changeLogData.push([
        entry.id,
        entry.timestamp,
        entry.author,
        entry.description,
      ]);
    });

    const changeLogSheet = XLSX.utils.aoa_to_sheet(changeLogData);
    XLSX.utils.book_append_sheet(workbook, changeLogSheet, 'Change Log');
  }

  // Generate filename
  const safeName = (blueprint.title || 'blueprint')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const outputFilename = filename || `${safeName}-v${blueprint.version}.xlsx`;

  // Download
  XLSX.writeFile(workbook, outputFilename);
}

// Export to PDF format
export function exportToPDF(blueprint: Blueprint, filename?: string, canvasImageData?: string | null) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(blueprint.title || 'Untitled Blueprint', 20, yPosition);
  yPosition += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Version ${blueprint.version} | ${blueprint.status}`, 20, yPosition);
  yPosition += 10;

  doc.setTextColor(0);
  if (blueprint.description) {
    const splitDescription = doc.splitTextToSize(blueprint.description, 170);
    doc.text(splitDescription, 20, yPosition);
    yPosition += splitDescription.length * 5 + 10;
  }

  // Metadata section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Blueprint Information', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const metadataItems = [
    ['Created By:', blueprint.createdBy || 'N/A'],
    ['Last Modified By:', blueprint.lastModifiedBy || 'N/A'],
    ['Last Modified Date:', blueprint.lastModifiedDate || 'N/A'],
    ['Impacted Audiences:', blueprint.impactedAudiences.join(', ') || 'N/A'],
    ['Business Benefits:', blueprint.businessBenefits.join(', ') || 'N/A'],
    ['Client Contacts:', blueprint.clientContacts.join(', ') || 'N/A'],
  ];

  metadataItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    const splitValue = doc.splitTextToSize(value, 140);
    doc.text(splitValue, 60, yPosition);
    yPosition += Math.max(5, splitValue.length * 5);
  });

  // Add process diagram if canvas image is provided
  if (canvasImageData) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Process Flow Diagram', 20, yPosition);
    yPosition += 10;

    try {
      // Calculate image dimensions to fit on page (leaving margins)
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - 40; // 20px margin on each side
      const maxHeight = pageHeight - yPosition - 20; // Space for title and bottom margin

      // Add the image (it will be automatically scaled to fit)
      doc.addImage(canvasImageData, 'PNG', 20, yPosition, maxWidth, maxHeight, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to add diagram to PDF:', error);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150);
      doc.text('(Diagram could not be rendered)', 20, yPosition);
      doc.setTextColor(0);
    }
  }

  // Add new page for nodes
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Process Flow Nodes', 20, yPosition);
  yPosition += 10;

  // Group nodes by type
  const triggerNodes = blueprint.nodes.filter((n) => n.data.nodeType === 'trigger');
  const workNodes = blueprint.nodes.filter((n) => n.data.nodeType === 'work');
  const decisionNodes = blueprint.nodes.filter((n) => n.data.nodeType === 'decision');
  const workflowNodes = blueprint.nodes.filter((n) => n.data.nodeType === 'workflow');
  const endNodes = blueprint.nodes.filter((n) => n.data.nodeType === 'end');

  // Helper to add section
  const addNodeSection = (title: string, nodes: SerializedNode[]) => {
    if (nodes.length === 0) return;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(title, 20, yPosition);
    yPosition += 8;

    nodes.forEach((node, index) => {
      const data = node.data;

      // Check if we need a new page
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${data.name}`, 25, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      if (data.nodeType === 'trigger') {
        doc.text(`Type: ${data.triggerType}`, 30, yPosition);
        yPosition += 5;
        if (data.description) {
          const splitDesc = doc.splitTextToSize(`Description: ${data.description}`, 160);
          doc.text(splitDesc, 30, yPosition);
          yPosition += splitDesc.length * 4;
        }
      } else if (data.nodeType === 'work') {
        doc.text(`Worker: ${data.workerType}`, 30, yPosition);
        yPosition += 5;
        if (data.goal) {
          const splitGoal = doc.splitTextToSize(`Goal: ${data.goal}`, 160);
          doc.text(splitGoal, 30, yPosition);
          yPosition += splitGoal.length * 4;
        }
        if (data.inputs.length > 0) {
          doc.text(`Inputs: ${data.inputs.map((i) => i.name).join(', ')}`, 30, yPosition);
          yPosition += 5;
        }
        if (data.tasks.length > 0) {
          doc.text('Tasks:', 30, yPosition);
          yPosition += 4;
          data.tasks.forEach((task) => {
            const splitTask = doc.splitTextToSize(`• ${task}`, 155);
            doc.text(splitTask, 35, yPosition);
            yPosition += splitTask.length * 4;
          });
        }
        if (data.outputs.length > 0) {
          doc.text(`Outputs: ${data.outputs.map((o) => o.name).join(', ')}`, 30, yPosition);
          yPosition += 5;
        }
        if (data.integrations.length > 0) {
          const integrationsDetails = migrateIntegrations(data.integrations);
          const intNames = integrationsDetails.map((int) => int.name).join(', ');
          doc.text(`Integrations: ${intNames}`, 30, yPosition);
          yPosition += 5;
        }
      } else if (data.nodeType === 'decision') {
        if (data.description) {
          const splitDesc = doc.splitTextToSize(`Description: ${data.description}`, 160);
          doc.text(splitDesc, 30, yPosition);
          yPosition += splitDesc.length * 4;
        }
        if (data.conditions && data.conditions.length > 0) {
          doc.text('Branches:', 30, yPosition);
          yPosition += 4;
          data.conditions.forEach((cond) => {
            doc.text(`• ${cond.label}`, 35, yPosition);
            yPosition += 4;
          });
        }
      } else if (data.nodeType === 'workflow') {
        doc.text(`Workflow: ${data.workflowName || 'N/A'} (v${data.version})`, 30, yPosition);
        yPosition += 5;
        if (data.description) {
          const splitDesc = doc.splitTextToSize(`Description: ${data.description}`, 160);
          doc.text(splitDesc, 30, yPosition);
          yPosition += splitDesc.length * 4;
        }
      } else if (data.nodeType === 'end') {
        if (data.outcome) {
          const splitOutcome = doc.splitTextToSize(`Outcome: ${data.outcome}`, 160);
          doc.text(splitOutcome, 30, yPosition);
          yPosition += splitOutcome.length * 4;
        }
      }

      yPosition += 5;
    });

    yPosition += 5;
  };

  addNodeSection('Triggers', triggerNodes);
  addNodeSection('Work Nodes', workNodes);
  addNodeSection('Decision Points', decisionNodes);
  addNodeSection('Sub-Workflows', workflowNodes);
  addNodeSection('End Points', endNodes);

  // Connections table
  if (blueprint.edges.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Process Connections', 20, yPosition);
    yPosition += 10;

    const connectionsTableData = blueprint.edges.map((edge) => {
      const sourceNode = blueprint.nodes.find((n) => n.id === edge.source);
      const targetNode = blueprint.nodes.find((n) => n.id === edge.target);
      return [
        sourceNode?.data.name || edge.source,
        targetNode?.data.name || edge.target,
        edge.data?.conditionLabel || '—',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['From', 'To', 'Condition']],
      body: connectionsTableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
      },
    });
  }

  // Integration details
  const workNodesWithIntegrations = blueprint.nodes.filter(
    (n) => n.data.nodeType === 'work' && n.data.integrations.length > 0
  );

  if (workNodesWithIntegrations.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Integration Details', 20, yPosition);
    yPosition += 10;

    workNodesWithIntegrations.forEach((node) => {
      if (node.data.nodeType !== 'work') return;
      const integrations = migrateIntegrations(node.data.integrations);

      integrations.forEach((integration) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${node.data.name} - ${integration.name}`, 20, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        if (integration.action) {
          const splitAction = doc.splitTextToSize(`Action: ${integration.action}`, 170);
          doc.text(splitAction, 25, yPosition);
          yPosition += splitAction.length * 4 + 3;
        }

        if (integration.apiEndpoints.length > 0) {
          doc.text('API Endpoints:', 25, yPosition);
          yPosition += 4;
          integration.apiEndpoints.forEach((ep) => {
            doc.text(`• ${ep.method} ${ep.url}`, 30, yPosition);
            yPosition += 4;
          });
          yPosition += 2;
        }

        yPosition += 5;
      });
    });
  }

  // Comments
  if (blueprint.comments && blueprint.comments.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comments', 20, yPosition);
    yPosition += 10;

    const commentsTableData = blueprint.comments.map((comment) => {
      const node = blueprint.nodes.find((n) => n.id === comment.nodeId);
      return [
        node?.data.name || comment.nodeId,
        comment.author,
        new Date(comment.timestamp).toLocaleDateString(),
        comment.text,
        comment.resolved ? 'Yes' : 'No',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Node', 'Author', 'Date', 'Comment', 'Resolved']],
      body: commentsTableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 80 },
        4: { cellWidth: 20 },
      },
    });
  }

  // Change log
  if (blueprint.changeLog && blueprint.changeLog.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Change Log', 20, yPosition);
    yPosition += 10;

    const changeLogTableData = blueprint.changeLog.map((entry) => [
      new Date(entry.timestamp).toLocaleDateString(),
      entry.author,
      entry.description,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Author', 'Description']],
      body: changeLogTableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 105 },
      },
    });
  }

  // Generate filename
  const safeName = (blueprint.title || 'blueprint')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const outputFilename = filename || `${safeName}-v${blueprint.version}.pdf`;

  // Download
  doc.save(outputFilename);
}
