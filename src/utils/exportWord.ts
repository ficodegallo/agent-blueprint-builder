import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  PageBreak,
  ImageRun,
  TableOfContents,
  PageNumber,
  NumberFormat,
  ShadingType,
  Footer,
  Header,
} from 'docx';
import type { Blueprint, SerializedNode } from '../types';
import type { BlueprintEdge } from '../types/edges';
import { migrateIntegrations } from '../types/nodes';
import type { IntegrationDetail, ApiEndpoint } from '../types/nodes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeName(title: string): string {
  return (title || 'blueprint')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** BFS ordering from trigger nodes; disconnected nodes appended at end. */
function orderNodesBFS(nodes: SerializedNode[], edges: BlueprintEdge[]): SerializedNode[] {
  const adjacency = new Map<string, string[]>();
  edges.forEach((e) => {
    const list = adjacency.get(e.source) || [];
    list.push(e.target);
    adjacency.set(e.source, list);
  });

  const visited = new Set<string>();
  const ordered: SerializedNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Start BFS from trigger nodes
  const triggers = nodes.filter((n) => n.data.nodeType === 'trigger');
  const queue = triggers.map((t) => t.id);
  triggers.forEach((t) => visited.add(t.id));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) ordered.push(node);

    const neighbors = adjacency.get(id) || [];
    for (const nId of neighbors) {
      if (!visited.has(nId)) {
        visited.add(nId);
        queue.push(nId);
      }
    }
  }

  // Append disconnected nodes
  nodes.forEach((n) => {
    if (!visited.has(n.id)) ordered.push(n);
  });

  return ordered;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 624; // ~6.5 inches at 96dpi
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      resolve({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      });
    };
    img.onerror = () => resolve({ width: 624, height: 400 });
    img.src = dataUrl;
  });
}

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
};

const DEFAULT_HEADER_COLOR = '2B579A';

// Node type → header color mapping (matches canvas node colors)
const NODE_HEADER_COLORS: Record<string, { fill: string; text: string }> = {
  trigger:    { fill: '10B981', text: 'FFFFFF' }, // Emerald/Green
  agent:      { fill: 'F97316', text: 'FFFFFF' }, // Orange
  automation: { fill: 'EAB308', text: '1A1A1A' }, // Yellow — dark text for readability
  human:      { fill: '3B82F6', text: 'FFFFFF' }, // Blue
  decision:   { fill: 'F59E0B', text: '1A1A1A' }, // Amber — dark text for readability
  end:        { fill: 'EF4444', text: 'FFFFFF' }, // Red
  workflow:   { fill: 'A855F7', text: 'FFFFFF' }, // Purple
};

/** Resolve the header color for a given node's data. */
function getNodeHeaderColor(data: SerializedNode['data']): { fill: string; text: string } {
  if (data.nodeType === 'work') {
    return NODE_HEADER_COLORS[data.workerType] || { fill: DEFAULT_HEADER_COLOR, text: 'FFFFFF' };
  }
  return NODE_HEADER_COLORS[data.nodeType] || { fill: DEFAULT_HEADER_COLOR, text: 'FFFFFF' };
}

function makeHeaderCell(text: string, widthPct?: number, color?: { fill: string; text: string }): TableCell {
  const fillColor = color?.fill || DEFAULT_HEADER_COLOR;
  const textColor = color?.text || 'FFFFFF';
  return new TableCell({
    borders: BORDER,
    shading: { type: ShadingType.SOLID, color: fillColor, fill: fillColor },
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: textColor, font: 'Calibri', size: 22 })],
      }),
    ],
  });
}

function makeCell(text: string, widthPct?: number): TableCell {
  return new TableCell({
    borders: BORDER,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: 'Calibri', size: 22 })],
      }),
    ],
  });
}

function makeHeaderRow(...cells: { text: string; width?: number }[]): TableRow {
  return new TableRow({
    children: cells.map((c) => makeHeaderCell(c.text, c.width)),
  });
}

/** Header row colored to match a specific node type. */
function makeColoredHeaderRow(color: { fill: string; text: string }, ...cells: { text: string; width?: number }[]): TableRow {
  return new TableRow({
    children: cells.map((c) => makeHeaderCell(c.text, c.width, color)),
  });
}

function makeRow(...cells: { text: string; width?: number }[]): TableRow {
  return new TableRow({
    children: cells.map((c) => makeCell(c.text, c.width)),
  });
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
    spacing: { after: 80 },
  });
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: value || 'N/A', font: 'Calibri', size: 22 }),
    ],
    spacing: { after: 60 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function nodeTypeLabel(data: SerializedNode['data']): string {
  switch (data.nodeType) {
    case 'work':
      return `${data.workerType.charAt(0).toUpperCase()}${data.workerType.slice(1)}`;
    case 'trigger':
      return `Trigger (${data.triggerType})`;
    case 'workflow':
      return 'Workflow';
    case 'decision':
      return 'Decision';
    case 'end':
      return 'End';
  }
}

// ── Section Builders ─────────────────────────────────────────────────────────

function buildCoverPage(blueprint: Blueprint): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'BUSINESS REQUIREMENTS DOCUMENT',
          bold: true,
          font: 'Calibri',
          size: 52,
          color: '2B579A',
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: blueprint.title || 'Untitled Blueprint',
          bold: true,
          font: 'Calibri',
          size: 40,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Version ${blueprint.version}  |  ${blueprint.status}`,
          font: 'Calibri',
          size: 24,
          color: '666666',
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 800 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Client Name: ', bold: true, font: 'Calibri', size: 24 }),
        new TextRun({ text: blueprint.clientName || 'N/A', font: 'Calibri', size: 24 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [
        new TextRun({ text: 'Project / Engagement: ', bold: true, font: 'Calibri', size: 24 }),
        new TextRun({ text: blueprint.projectName || 'N/A', font: 'Calibri', size: 24 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [
        new TextRun({ text: 'Created By: ', bold: true, font: 'Calibri', size: 24 }),
        new TextRun({ text: blueprint.createdBy || 'N/A', font: 'Calibri', size: 24 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [
        new TextRun({ text: 'Last Modified: ', bold: true, font: 'Calibri', size: 24 }),
        new TextRun({
          text: blueprint.lastModifiedDate
            ? new Date(blueprint.lastModifiedDate).toLocaleDateString()
            : 'N/A',
          font: 'Calibri',
          size: 24,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 1200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'CONFIDENTIAL — INTERNAL USE ONLY',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: '999999',
          italics: true,
        }),
      ],
    }),
    pageBreak(),
  ];
}

function buildVersionHistory(blueprint: Blueprint): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('Version History'));

  if (blueprint.changeLog && blueprint.changeLog.length > 0) {
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeHeaderRow(
            { text: 'Version', width: 15 },
            { text: 'Date', width: 20 },
            { text: 'Author', width: 25 },
            { text: 'Description', width: 40 }
          ),
          ...blueprint.changeLog.map((entry) =>
            makeRow(
              { text: blueprint.version, width: 15 },
              { text: new Date(entry.timestamp).toLocaleDateString(), width: 20 },
              { text: entry.author, width: 25 },
              { text: entry.description, width: 40 }
            )
          ),
        ],
      })
    );
  } else {
    elements.push(bodyText('No version history recorded.'));
  }

  elements.push(new Paragraph({ spacing: { before: 400 } }));
  elements.push(heading2('Document Approval'));

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeHeaderRow(
          { text: 'Role', width: 25 },
          { text: 'Name', width: 30 },
          { text: 'Date', width: 20 },
          { text: 'Signature', width: 25 }
        ),
        makeRow({ text: 'Business Owner', width: 25 }, { text: '', width: 30 }, { text: '', width: 20 }, { text: '', width: 25 }),
        makeRow({ text: 'Technical Lead', width: 25 }, { text: '', width: 30 }, { text: '', width: 20 }, { text: '', width: 25 }),
        makeRow({ text: 'Project Manager', width: 25 }, { text: '', width: 30 }, { text: '', width: 20 }, { text: '', width: 25 }),
      ],
    })
  );

  elements.push(pageBreak());
  return elements;
}

function buildTableOfContents(): (Paragraph | TableOfContents)[] {
  return [
    heading1('Table of Contents'),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Right-click and select "Update Field" to populate page numbers.',
          italics: true,
          font: 'Calibri',
          size: 20,
          color: '888888',
        }),
      ],
      spacing: { after: 200 },
    }),
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-2',
    }),
    pageBreak(),
  ];
}

function buildExecutiveSummary(
  blueprint: Blueprint,
  orderedNodes: SerializedNode[]
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('1. Executive Summary'));

  // 1.1 Process Overview
  elements.push(heading2('1.1 Process Overview'));
  if (blueprint.description) {
    elements.push(bodyText(blueprint.description));
  }

  // Auto-generated summary
  const triggers = orderedNodes.filter((n) => n.data.nodeType === 'trigger').length;
  const agents = orderedNodes.filter((n) => n.data.nodeType === 'work' && n.data.workerType === 'agent').length;
  const automations = orderedNodes.filter((n) => n.data.nodeType === 'work' && n.data.workerType === 'automation').length;
  const humans = orderedNodes.filter((n) => n.data.nodeType === 'work' && n.data.workerType === 'human').length;
  const decisions = orderedNodes.filter((n) => n.data.nodeType === 'decision').length;
  const workflows = orderedNodes.filter((n) => n.data.nodeType === 'workflow').length;
  const ends = orderedNodes.filter((n) => n.data.nodeType === 'end').length;

  const parts: string[] = [];
  if (triggers > 0) parts.push(`${triggers} Trigger${triggers > 1 ? 's' : ''}`);
  if (agents > 0) parts.push(`${agents} AI Agent${agents > 1 ? 's' : ''}`);
  if (automations > 0) parts.push(`${automations} Automation${automations > 1 ? 's' : ''}`);
  if (humans > 0) parts.push(`${humans} Human Task${humans > 1 ? 's' : ''}`);
  if (decisions > 0) parts.push(`${decisions} Decision${decisions > 1 ? 's' : ''}`);
  if (workflows > 0) parts.push(`${workflows} Workflow${workflows > 1 ? 's' : ''}`);
  if (ends > 0) parts.push(`${ends} End Point${ends > 1 ? 's' : ''}`);

  elements.push(
    bodyText(`This process contains ${orderedNodes.length} nodes: ${parts.join(', ')}.`)
  );

  // 1.2 Impacted Audiences
  elements.push(heading2('1.2 Impacted Audiences'));
  if (blueprint.impactedAudiences.length > 0) {
    blueprint.impactedAudiences.forEach((a) => elements.push(bulletItem(a)));
  } else {
    elements.push(bodyText('None specified.'));
  }

  // 1.3 Business Benefits
  elements.push(heading2('1.3 Business Benefits'));
  if (blueprint.businessBenefits.length > 0) {
    blueprint.businessBenefits.forEach((b) => elements.push(bulletItem(b)));
  } else {
    elements.push(bodyText('None specified.'));
  }

  // 1.4 Key Contacts
  elements.push(heading2('1.4 Key Contacts'));
  if (blueprint.clientContacts.length > 0) {
    blueprint.clientContacts.forEach((c) => elements.push(bulletItem(c)));
  } else {
    elements.push(bodyText('None specified.'));
  }

  elements.push(pageBreak());
  return elements;
}

async function buildProcessFlowOverview(
  _blueprint: Blueprint,
  orderedNodes: SerializedNode[],
  canvasImageData?: string | null
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('2. Process Flow Overview'));

  // 2.1 Flow Diagram
  elements.push(heading2('2.1 Flow Diagram'));

  if (canvasImageData) {
    try {
      const dims = await getImageDimensions(canvasImageData);
      const imageBytes = dataUrlToUint8Array(canvasImageData);
      elements.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBytes,
              transformation: { width: dims.width, height: dims.height },
              type: 'png',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    } catch {
      elements.push(bodyText('Diagram could not be rendered.'));
    }
  } else {
    elements.push(bodyText('Diagram not available. Export from the canvas editor to include a visual flow diagram.'));
  }

  // 2.2 Node Summary Table
  elements.push(heading2('2.2 Node Summary Table'));

  const summaryRows = orderedNodes.map((node, i) => {
    const data = node.data;
    let desc = '';
    if (data.nodeType === 'work') desc = (data.goal as string) || '';
    else if (data.nodeType === 'trigger') desc = (data.description as string) || '';
    else if (data.nodeType === 'decision') desc = (data.description as string) || '';
    else if (data.nodeType === 'end') desc = (data.outcome as string) || '';
    else if (data.nodeType === 'workflow') desc = (data.description as string) || '';

    // Truncate long descriptions for summary table
    const truncated = desc.length > 100 ? desc.substring(0, 97) + '...' : desc;

    return makeRow(
      { text: String(i + 1), width: 8 },
      { text: data.name, width: 25 },
      { text: nodeTypeLabel(data), width: 20 },
      { text: truncated, width: 47 }
    );
  });

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeHeaderRow(
          { text: '#', width: 8 },
          { text: 'Node Name', width: 25 },
          { text: 'Type', width: 20 },
          { text: 'Description / Goal', width: 47 }
        ),
        ...summaryRows,
      ],
    })
  );

  elements.push(pageBreak());
  return elements;
}

function buildDetailedNodeSpecs(
  _blueprint: Blueprint,
  orderedNodes: SerializedNode[]
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('3. Detailed Node Specifications'));

  orderedNodes.forEach((node, idx) => {
    const data = node.data;
    const typeTag = nodeTypeLabel(data).toUpperCase();
    const nodeColor = getNodeHeaderColor(data);
    elements.push(heading2(`3.${idx + 1} [${typeTag}] ${data.name}`));

    // Metadata table (colored by node type)
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeColoredHeaderRow(nodeColor, { text: 'Field', width: 30 }, { text: 'Value', width: 70 }),
          makeRow({ text: 'Node ID', width: 30 }, { text: node.id, width: 70 }),
          makeRow({ text: 'Type', width: 30 }, { text: data.nodeType, width: 70 }),
          makeRow(
            { text: 'Sub-Type', width: 30 },
            {
              text:
                data.nodeType === 'work'
                  ? (data.workerType as string)
                  : data.nodeType === 'trigger'
                    ? (data.triggerType as string)
                    : '—',
              width: 70,
            }
          ),
        ],
      })
    );

    elements.push(new Paragraph({ spacing: { before: 120 } }));

    // Type-specific content
    if (data.nodeType === 'trigger') {
      if (data.description) elements.push(labelValue('Description', data.description as string));
      if (data.configuration) elements.push(labelValue('Configuration', data.configuration as string));
    } else if (data.nodeType === 'work') {
      const goal = data.goal as string;
      const inputs = data.inputs as { name: string; required: boolean }[];
      const tasks = data.tasks as string[];
      const outputs = data.outputs as { name: string; required: boolean }[];
      const integrations = migrateIntegrations(
        data.integrations as Array<string | IntegrationDetail>
      );

      // Goal
      if (goal) {
        elements.push(labelValue('Goal', goal));
      }

      // Inputs table
      if (inputs.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Inputs', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'Name', width: 60 }, { text: 'Required', width: 40 }),
              ...inputs.map((inp) =>
                makeRow(
                  { text: inp.name, width: 60 },
                  { text: inp.required ? 'Required' : 'Optional', width: 40 }
                )
              ),
            ],
          })
        );
      }

      // Tasks numbered list
      if (tasks.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Tasks', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        tasks.forEach((task, tIdx) => {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${tIdx + 1}. ${task}`, font: 'Calibri', size: 22 }),
              ],
              spacing: { after: 40 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Outputs table
      if (outputs.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Outputs', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'Name', width: 60 }, { text: 'Required', width: 40 }),
              ...outputs.map((out) =>
                makeRow(
                  { text: out.name, width: 60 },
                  { text: out.required ? 'Required' : 'Optional', width: 40 }
                )
              ),
            ],
          })
        );
      }

      // Integrations
      if (integrations.length > 0) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Integrations', bold: true, font: 'Calibri', size: 22 }),
            ],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'System', width: 30 }, { text: 'Action', width: 70 }),
              ...integrations.map((int) =>
                makeRow(
                  { text: int.name, width: 30 },
                  { text: int.action || '—', width: 70 }
                )
              ),
            ],
          })
        );

        // API endpoint details per integration
        integrations.forEach((int) => {
          if (int.apiEndpoints.length > 0) {
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `API Endpoints — ${int.name}`,
                    bold: true,
                    italics: true,
                    font: 'Calibri',
                    size: 20,
                  }),
                ],
                spacing: { before: 100, after: 40 },
                indent: { left: 360 },
              })
            );

            int.apiEndpoints.forEach((ep: ApiEndpoint) => {
              elements.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    makeColoredHeaderRow(
                      nodeColor,
                      { text: 'Method', width: 15 },
                      { text: 'URL', width: 45 },
                      { text: 'Auth', width: 20 },
                      { text: 'Rate Limit', width: 20 }
                    ),
                    makeRow(
                      { text: ep.method, width: 15 },
                      { text: ep.url, width: 45 },
                      { text: ep.auth_type || '—', width: 20 },
                      { text: ep.rate_limit || '—', width: 20 }
                    ),
                  ],
                })
              );

              // Parameters
              if (ep.parameters && ep.parameters.length > 0) {
                elements.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Parameters:',
                        italics: true,
                        font: 'Calibri',
                        size: 20,
                      }),
                    ],
                    spacing: { before: 60, after: 40 },
                    indent: { left: 720 },
                  })
                );
                elements.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      makeColoredHeaderRow(
                        nodeColor,
                        { text: 'Name', width: 20 },
                        { text: 'Type', width: 15 },
                        { text: 'Location', width: 15 },
                        { text: 'Required', width: 15 },
                        { text: 'Description', width: 35 }
                      ),
                      ...ep.parameters.map((p) =>
                        makeRow(
                          { text: p.name, width: 20 },
                          { text: p.type, width: 15 },
                          { text: p.location, width: 15 },
                          { text: p.required ? 'Yes' : 'No', width: 15 },
                          { text: p.description, width: 35 }
                        )
                      ),
                    ],
                  })
                );
              }

              // Response Fields
              if (ep.response_fields && ep.response_fields.length > 0) {
                elements.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Response Fields:',
                        italics: true,
                        font: 'Calibri',
                        size: 20,
                      }),
                    ],
                    spacing: { before: 60, after: 40 },
                    indent: { left: 720 },
                  })
                );
                elements.push(
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      makeColoredHeaderRow(
                        nodeColor,
                        { text: 'Name', width: 20 },
                        { text: 'Type', width: 15 },
                        { text: 'JSON Path', width: 30 },
                        { text: 'Description', width: 35 }
                      ),
                      ...ep.response_fields.map((rf) =>
                        makeRow(
                          { text: rf.name, width: 20 },
                          { text: rf.type, width: 15 },
                          { text: rf.json_path, width: 30 },
                          { text: rf.description, width: 35 }
                        )
                      ),
                    ],
                  })
                );
              }
            });
          }
        });
      }
    } else if (data.nodeType === 'decision') {
      if (data.description) elements.push(labelValue('Description', data.description as string));

      const conditions = data.conditions as { id: string; label: string; description: string }[];
      if (conditions && conditions.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Branches', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'Label', width: 30 }, { text: 'Description', width: 70 }),
              ...conditions.map((c) =>
                makeRow({ text: c.label, width: 30 }, { text: c.description || '—', width: 70 })
              ),
            ],
          })
        );
      }
    } else if (data.nodeType === 'end') {
      if (data.outcome) elements.push(labelValue('Outcome', data.outcome as string));
    } else if (data.nodeType === 'workflow') {
      elements.push(labelValue('Workflow Name', (data.workflowName as string) || 'N/A'));
      elements.push(labelValue('Version', (data.version as string) || 'N/A'));
      if (data.description) elements.push(labelValue('Description', data.description as string));

      const inputs = data.inputs as { name: string; required: boolean }[];
      const outputs = data.outputs as { name: string; required: boolean }[];

      if (inputs && inputs.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Inputs', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'Name', width: 60 }, { text: 'Required', width: 40 }),
              ...inputs.map((inp) =>
                makeRow(
                  { text: inp.name, width: 60 },
                  { text: inp.required ? 'Required' : 'Optional', width: 40 }
                )
              ),
            ],
          })
        );
      }

      if (outputs && outputs.length > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: 'Outputs', bold: true, font: 'Calibri', size: 22 })],
            spacing: { before: 120, after: 60 },
          })
        );
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeColoredHeaderRow(nodeColor, { text: 'Name', width: 60 }, { text: 'Required', width: 40 }),
              ...outputs.map((out) =>
                makeRow(
                  { text: out.name, width: 60 },
                  { text: out.required ? 'Required' : 'Optional', width: 40 }
                )
              ),
            ],
          })
        );
      }
    }

    // AI metadata note if present
    if (data.ai_generated) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `AI Generated (confidence: ${data.ai_confidence || 'unknown'})`,
              italics: true,
              font: 'Calibri',
              size: 18,
              color: '888888',
            }),
          ],
          spacing: { before: 60 },
        })
      );
      if (data.ai_notes) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `AI Notes: ${data.ai_notes as string}`,
                italics: true,
                font: 'Calibri',
                size: 18,
                color: '888888',
              }),
            ],
          })
        );
      }
    }

    elements.push(new Paragraph({ spacing: { before: 200 } }));
  });

  elements.push(pageBreak());
  return elements;
}

function buildIntegrationSpecs(
  _blueprint: Blueprint,
  orderedNodes: SerializedNode[]
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('4. Integration Specifications'));

  // Aggregate by system name (case-insensitive)
  const systemMap = new Map<
    string,
    {
      displayName: string;
      usedByNodes: { nodeId: string; nodeName: string }[];
      endpoints: { ep: ApiEndpoint; nodeName: string }[];
      integrations: { int: IntegrationDetail; nodeName: string }[];
    }
  >();

  orderedNodes.forEach((node) => {
    if (node.data.nodeType !== 'work') return;
    const integrations = migrateIntegrations(
      node.data.integrations as Array<string | IntegrationDetail>
    );

    integrations.forEach((int) => {
      const key = int.name.toLowerCase().trim();
      if (!key) return;

      if (!systemMap.has(key)) {
        systemMap.set(key, {
          displayName: int.name,
          usedByNodes: [],
          endpoints: [],
          integrations: [],
        });
      }

      const entry = systemMap.get(key)!;
      entry.usedByNodes.push({ nodeId: node.id, nodeName: node.data.name });
      entry.integrations.push({ int, nodeName: node.data.name });

      int.apiEndpoints.forEach((ep) => {
        entry.endpoints.push({ ep, nodeName: node.data.name });
      });
    });
  });

  if (systemMap.size === 0) {
    elements.push(bodyText('No integrations configured.'));
    elements.push(pageBreak());
    return elements;
  }

  systemMap.forEach((system) => {
    elements.push(heading2(system.displayName));

    // Used By Nodes
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Used by: ', bold: true, font: 'Calibri', size: 22 }),
          new TextRun({
            text: [...new Set(system.usedByNodes.map((n) => n.nodeName))].join(', '),
            font: 'Calibri',
            size: 22,
          }),
        ],
        spacing: { after: 80 },
      })
    );

    // API Endpoints table
    if (system.endpoints.length > 0) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'API Endpoints', bold: true, font: 'Calibri', size: 22 }),
          ],
          spacing: { before: 100, after: 60 },
        })
      );
      elements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeHeaderRow(
              { text: 'Method', width: 12 },
              { text: 'URL', width: 48 },
              { text: 'Used In Node', width: 40 }
            ),
            ...system.endpoints.map((e) =>
              makeRow(
                { text: e.ep.method, width: 12 },
                { text: e.ep.url, width: 48 },
                { text: e.nodeName, width: 40 }
              )
            ),
          ],
        })
      );

      // Per-endpoint details for discovered endpoints
      system.endpoints.forEach((e) => {
        const ep = e.ep;
        if (!ep.parameters?.length && !ep.response_fields?.length && !ep.auth_type && !ep.documentation_url)
          return;

        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${ep.method} ${ep.url}`,
                bold: true,
                italics: true,
                font: 'Calibri',
                size: 20,
              }),
              ...(ep.name
                ? [new TextRun({ text: ` — ${ep.name}`, font: 'Calibri', size: 20 })]
                : []),
            ],
            spacing: { before: 100, after: 40 },
            indent: { left: 360 },
          })
        );

        if (ep.auth_type)
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Auth: ${ep.auth_type}`, font: 'Calibri', size: 20 }),
              ],
              indent: { left: 720 },
            })
          );
        if (ep.rate_limit)
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Rate Limit: ${ep.rate_limit}`, font: 'Calibri', size: 20 }),
              ],
              indent: { left: 720 },
            })
          );
        if (ep.documentation_url)
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Docs: ${ep.documentation_url}`, font: 'Calibri', size: 20 }),
              ],
              indent: { left: 720 },
            })
          );
      });
    }

    elements.push(new Paragraph({ spacing: { before: 200 } }));
  });

  elements.push(pageBreak());
  return elements;
}

function buildAppendices(
  _blueprint: Blueprint,
  orderedNodes: SerializedNode[]
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(heading1('5. Appendices'));

  // A. Glossary
  elements.push(heading2('A. Glossary'));
  const glossary: [string, string][] = [
    ['Agent', 'An AI-powered worker that autonomously performs tasks using language models and integrations.'],
    ['Automation', 'A system-driven process step that executes without human intervention via APIs or scheduled jobs.'],
    ['Human-in-the-Loop', 'A process step requiring human judgment, approval, or manual data entry.'],
    ['Trigger', 'The entry point of a process flow — can be event-based, scheduled, or manually initiated.'],
    ['Decision', 'A branching point where the flow diverges based on conditions or criteria.'],
    ['Workflow', 'A reference to another reusable blueprint or sub-process.'],
    ['End', 'A termination point indicating the process outcome (success, failure, or other).'],
  ];

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeHeaderRow({ text: 'Term', width: 25 }, { text: 'Definition', width: 75 }),
        ...glossary.map(([term, def]) =>
          makeRow({ text: term, width: 25 }, { text: def, width: 75 })
        ),
      ],
    })
  );

  // B. Data Field Definitions
  elements.push(heading2('B. Data Field Definitions'));

  const fieldMap = new Map<string, { nodes: Set<string>; required: boolean }>();

  orderedNodes.forEach((node) => {
    const data = node.data;
    if (data.nodeType === 'work' || data.nodeType === 'workflow') {
      const inputs = data.inputs as { name: string; required: boolean }[];
      const outputs = data.outputs as { name: string; required: boolean }[];

      [...inputs, ...outputs].forEach((io) => {
        if (!io.name) return;
        const existing = fieldMap.get(io.name);
        if (existing) {
          existing.nodes.add(data.name);
          if (io.required) existing.required = true;
        } else {
          fieldMap.set(io.name, { nodes: new Set([data.name]), required: io.required });
        }
      });
    }
  });

  if (fieldMap.size > 0) {
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeHeaderRow(
            { text: 'Field Name', width: 30 },
            { text: 'Used In Nodes', width: 50 },
            { text: 'Required', width: 20 }
          ),
          ...[...fieldMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, info]) =>
              makeRow(
                { text: name, width: 30 },
                { text: [...info.nodes].join(', '), width: 50 },
                { text: info.required ? 'Required' : 'Optional', width: 20 }
              )
            ),
        ],
      })
    );
  } else {
    elements.push(bodyText('No data fields defined.'));
  }

  // C. Error Handling
  elements.push(heading2('C. Error Handling'));
  elements.push(bodyText('To be defined during implementation planning.'));

  return elements;
}

// ── Main Export Function ─────────────────────────────────────────────────────

export async function exportToWord(
  blueprint: Blueprint,
  canvasImageData?: string | null
): Promise<void> {
  const orderedNodes = orderNodesBFS(blueprint.nodes, blueprint.edges);

  const flowOverview = await buildProcessFlowOverview(blueprint, orderedNodes, canvasImageData);

  const doc = new Document({
    title: blueprint.title || 'Business Requirements Document',
    creator: blueprint.createdBy || 'Agent Blueprint Builder',
    description: blueprint.description || '',
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 32,
            bold: true,
            color: '2B579A',
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 26,
            bold: true,
            color: '2B579A',
          },
          paragraph: {
            spacing: { before: 200, after: 100 },
          },
        },
      },
    },
    features: {
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: blueprint.title || 'Business Requirements Document',
                    italics: true,
                    font: 'Calibri',
                    size: 18,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    font: 'Calibri',
                    size: 18,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...buildCoverPage(blueprint),
          ...buildVersionHistory(blueprint),
          ...buildTableOfContents(),
          ...buildExecutiveSummary(blueprint, orderedNodes),
          ...flowOverview,
          ...buildDetailedNodeSpecs(blueprint, orderedNodes),
          ...buildIntegrationSpecs(blueprint, orderedNodes),
          ...buildAppendices(blueprint, orderedNodes),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = `${safeName(blueprint.title)}-v${blueprint.version}-BRD.docx`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
