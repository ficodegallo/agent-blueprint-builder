# Agent Blueprint Builder

A React-based SPA for designing business process blueprints that distribute work across AI Agents, Automations, Humans, and reusable Workflows.

## Quick Start

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (usually http://localhost:5173)
npm run build  # Production build
npm run test   # Run tests in watch mode
```

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Canvas**: React Flow v12 (@xyflow/react)
- **State**: Zustand (separate stores for nodes, edges, blueprint metadata, UI, comments)
- **Styling**: Tailwind CSS v4
- **Excel Export**: SheetJS (xlsx)
- **PDF Export**: jsPDF + jspdf-autotable + html2canvas
- **Testing**: Vitest

## Project Structure

```
src/
├── components/
│   ├── canvas/          # BlueprintCanvas.tsx - React Flow wrapper with auto-center
│   ├── dialogs/         # ExportDialog, ImportDialog, SaveLoadDialog
│   ├── layout/          # AppLayout, Header
│   ├── nodes/           # Custom node components (BaseNode, TriggerNode, WorkNode, DecisionNode, EndNode, WorkflowNode)
│   ├── pages/           # HomePage (library), BlueprintEditor, BlueprintCard
│   ├── panels/          # DetailPanel, TemplatePanel, ValidationPanel, BlueprintHeader, IntegrationDetailsDialog
│   └── shared/          # Modal, ListEditor, IOListEditor
├── constants/
│   └── colors.ts        # Node color definitions by type
├── data/
│   └── templates.ts     # 20 node templates with detailed integrations
├── features/
│   └── smartImport/     # AI-powered blueprint generation from documents
├── hooks/               # useLocalStorage, useAutoSave, useExport, useImport, useValidation, useTaskAutoOrder
├── store/               # Zustand stores (nodesStore, edgesStore, blueprintStore, uiStore, commentsStore, blueprintsLibraryStore)
├── types/               # TypeScript definitions (includes integration types)
└── utils/               # validation.ts, export.ts, import.ts, canvasExport.ts
```

## Key Files

- `src/App.tsx` - React Router setup with HomePage and BlueprintEditor routes
- `src/store/nodesStore.ts` - Central node state with React Flow integration
- `src/store/blueprintsLibraryStore.ts` - Multi-blueprint library management with localStorage persistence
- `src/components/canvas/BlueprintCanvas.tsx` - Main canvas with drag-drop support and auto-center to first trigger
- `src/components/pages/HomePage.tsx` - Blueprint library landing page with search and cards
- `src/components/pages/BlueprintEditor.tsx` - Main editor with auto-save to library
- `src/components/nodes/BaseNode.tsx` - Shared node styling with 4-sided handles
- `src/components/panels/DetailPanel.tsx` - Node editing panel (w-96 width) with enhanced integrations
- `src/components/panels/IntegrationDetailsDialog.tsx` - Detailed integration configuration dialog
- `src/components/shared/IOListEditor.tsx` - List editor with required/optional toggle
- `src/features/smartImport/` - AI-powered blueprint generation from PDF/Word/text documents
- `src/hooks/useTaskAutoOrder.ts` - AI-powered task reordering using Claude Opus 4.5
- `src/utils/validation.ts` - Blueprint validation rules
- `src/utils/export.ts` - JSON, Excel, and PDF export with Integration Details sheet
- `src/utils/canvasExport.ts` - Canvas diagram capture for PDF export

## Node Types

| Type | Color | Hex | Description |
|------|-------|-----|-------------|
| Trigger | Emerald/Green | #10b981 | Process entry points (event, scheduled, manual) |
| Work (Agent) | Orange | #f97316 | AI agent tasks |
| Work (Automation) | Yellow | #eab308 | Automated system tasks |
| Work (Human) | Blue | #3b82f6 | Human-performed tasks |
| Decision | Amber | #f59e0b | Branching logic with customizable Yes/No labels |
| End | Red | #ef4444 | Process termination |
| Workflow | Purple | #a855f7 | Reference to another workflow/blueprint |

## Node Handles

All nodes have handles on 4 sides:
- **Top & Left**: Target handles (inputs) - gray
- **Bottom & Right**: Source handles (outputs) - darker gray
- **Decision nodes**: Dynamic positioning based on number of branches (see Decision Node Features)

## Work Node Fields

Work nodes (Agent, Automation, Human) include:
- **Name**: Display name
- **Worker Type**: Agent, Automation, or Human
- **Goal**: What the node should achieve
- **Inputs**: List with required/optional toggle
- **Tasks**: Multi-line task list with:
  - **Manual Drag-and-Drop**: Reorder tasks by dragging grip handles
  - **Auto-Order Button**: AI-powered task reordering using Claude Opus 4.5 (considers goal, inputs, outputs, and dependencies)
  - **Autocomplete**: Type 3+ characters matching input/output names to see suggestions dropdown
  - Multi-line text areas for longer task descriptions
- **Outputs**: List with required/optional toggle
- **Integrations**: Detailed system integrations with:
  - Integration name (e.g., "Workday", "Salesforce")
  - Action summary (one-sentence description)
  - Input/Output mappings (selected from node I/O with descriptions and DB fields)
  - API endpoints (URL + HTTP method)
  - Click "Details" button to open IntegrationDetailsDialog for full configuration

## Workflow Node Fields

Workflow nodes reference other blueprints:
- **Description**: What the workflow does
- **Workflow Name**: Display name of referenced workflow
- **Workflow ID**: Unique identifier (for future linking)
- **Version**: Version of referenced workflow
- **Inputs**: Data passed to the workflow (required/optional)
- **Outputs**: Data returned from the workflow (required/optional)

## Decision Node Features

- **Multiple Branches**: Support for 2+ decision branches (not limited to Yes/No)
  - Minimum 2 branches required
  - Click "Add Branch" to add more decision paths
  - Remove branches (only when 3+ exist)
- **Customizable Labels**: Each branch has custom label and optional description
  - Examples: "Approved", "Approved with feedback", "Rejected", "Needs revision"
- **Dynamic Handle Positioning**:
  - **2 branches**: First at top-right, second at bottom-right
  - **3 branches**: Distributed on top, right, and bottom
  - **4+ branches**: Evenly distributed across right and bottom sides
- **Color-Coded Handles**:
  - 2 branches: Green (first), Red (second)
  - 3+ branches: Blue, Purple, Orange, Pink, Teal, Indigo (cycling pattern)

## Integration Details

Work nodes now support detailed integration configuration via IntegrationDetailsDialog:

### Integration Data Model
```typescript
interface IntegrationDetail {
  name: string;                    // Integration name
  action: string;                  // One-sentence summary
  inputs: IntegrationIOMapping[];  // Input mappings
  outputs: IntegrationIOMapping[]; // Output mappings
  apiEndpoints: ApiEndpoint[];     // API endpoints
}

interface IntegrationIOMapping {
  nodeIOName: string;     // References node's input/output
  description: string;    // Context-specific description
  databaseField: string;  // DB field mapping (e.g., "employee.firstName")
}

interface ApiEndpoint {
  id: string;             // UUID
  url: string;            // Endpoint URL
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}
```

### Features
- **Backward Compatible**: Old string[] integrations auto-migrate to new format
- **Input/Output Mapping**: Select from node's inputs/outputs via checkboxes, add descriptions and DB fields
- **API Endpoint Management**: Add multiple endpoints with URLs and HTTP methods
- **Excel Export**: Dedicated "Integration Details" sheet in Excel exports
- **Validation**: Ensures integration name and action are provided

### UI Flow
1. In DetailPanel, click **"Add Integration"** or **"Details"** on existing integration
2. IntegrationDetailsDialog opens with sections:
   - Name and Action (required fields)
   - Inputs (checkboxes from node inputs + description/DB field)
   - Outputs (checkboxes from node outputs + description/DB field)
   - API Endpoints (dynamic list with URL + method dropdown)
3. Click **"Save Integration"** to persist changes

## Task Auto-Order (AI-Powered Task Sequencing)

### Overview
Intelligently reorder task lists within work nodes using Claude Opus 4.5 to determine optimal execution sequence.

### How It Works
1. **Trigger**: Click "Auto-order" button in task list (appears when 2+ tasks exist)
2. **Context Analysis**: Sends to Claude API:
   - Current task list (unordered)
   - Node's goal
   - Available inputs (with required/optional flags)
   - Expected outputs (with required/optional flags)
3. **AI Processing**: Claude Opus 4.5 analyzes:
   - Dependencies between tasks
   - Logical execution flow
   - Input → Processing → Output pipeline
   - Optimal sequencing to achieve goal
4. **Result**: Returns reordered task list in optimal execution order

### Technical Details
- **API**: Uses Claude Opus 4.5 (`claude-opus-4-5-20251101`) via Anthropic API
- **Timeout**: 60 seconds for API call
- **Token Limit**: 4000 max tokens
- **Error Handling**: Displays error messages for API failures, auth issues, or timeouts
- **Validation**: Ensures returned task count matches original (no tasks added/removed)
- **Hook**: `useTaskAutoOrder()` provides `autoOrderTasks()`, `isOrdering`, `error`, and `clearError()`

## Smart Import (AI-Powered Blueprint Generation)

### Overview
Generate blueprints automatically from process documentation using Claude API.

### Supported File Types
- **PDF** (.pdf) - Text extraction with visual content analysis
- **Word** (.docx) - Document parsing with mammoth.js (with extensive debug logging)
- **Plain Text** (.txt) - Direct text processing

### Configuration Options
- **Optimization Goal**:
  - Speed: Minimize process steps
  - Accuracy: Emphasize validation and checks
  - Collaboration: Balance human and automation tasks
- **Granularity**:
  - High-level: Fewer nodes, broader steps
  - Detailed: More nodes, specific tasks
  - Comprehensive: Maximum detail with sub-tasks

### Workflow
1. **API Key Setup**: First-time users configure Claude API key (stored securely in localStorage)
   - **Test Connection**: Verify API key before generation with quick API test
   - Format validation: Keys must start with 'sk-ant-'
2. **File Upload**: Drag-and-drop or click to upload process document
3. **Options Selection**: Choose optimization goal and granularity
4. **Processing**:
   - Extract text from document (with comprehensive logging)
   - Send to Claude API with customizable prompts
   - Parse JSON response into blueprint format
   - **Cancel Generation**: User can cancel during processing
5. **Auto-Layout**: Robust BFS algorithm positions nodes by depth (left-to-right flow)
   - Cycle detection to prevent infinite loops
   - 10-second timeout protection
   - Fallback grid layout if auto-layout fails
6. **Load into Canvas**: Generated blueprint loads with AI metadata flags

### Prompt Customization
- **Edit Prompts**: Click "Edit Prompts" button to customize AI prompts
- **System Prompt**: Controls Claude's overall behavior and output format
- **User Prompt Template**: Template for user request with placeholders:
  - `{{EXTRACTED_CONTENT}}` - Document text
  - `{{PROCESS_NAME}}` - Process name
  - `{{OPTIMIZATION_GOAL}}` - Selected optimization goal
  - `{{GRANULARITY}}` - Selected detail level
- **Reset to Defaults**: Restore original prompts anytime
- **Persistence**: Custom prompts saved to localStorage

### AI Metadata
Generated nodes include:
- `ai_generated: true` - Marks node as AI-created
- `ai_confidence: 'high' | 'medium' | 'low'` - Confidence level
- `ai_notes: string` - Additional context or suggestions

### Technical Details
- **API**: Uses Claude Sonnet 4.5 via Anthropic API
- **Token Limits**: Checks content size before API call (configurable max tokens)
- **Timeouts**: 90-second timeout for API calls, 10-second timeout for layout
- **Error Handling**:
  - API key validation (format check)
  - Recoverable errors (rate limits, auth) vs non-recoverable
  - Enhanced error messages (network, CORS, timeout)
  - User cancellation support
- **Security**: API key base64 encoded in localStorage, never transmitted in logs
- **Layout Resilience**:
  - BFS with cycle detection (max iterations = nodes² safety limit)
  - Timeout protection for complex graphs
  - Fallback grid layout (5 columns) when auto-layout fails
- **Debug Logging**: Comprehensive console logging throughout all stages

## Validation Rules

**Errors (block export):**
- E001: Missing Trigger node
- E002: Missing End node
- E003: Disconnected nodes
- E004: Work nodes missing Goal

**Warnings:**
- W001: Missing name
- W002/W003: Empty inputs/tasks
- W004: Decision with <2 branches

## Data Flow

### Multi-Blueprint App Flow
1. **HomePage** (`/`) - Blueprint library with search, cards, create new
2. Click blueprint card → navigate to **BlueprintEditor** (`/blueprint/:id`)
3. Auto-load blueprint from library store → populate Zustand stores
4. **Auto-center canvas** to first trigger node with smooth animation
5. Changes → Zustand stores → **auto-save to library** (1s debounce)
6. Back to HomePage to see all blueprints

### Canvas Interaction
1. Templates dragged from TemplatePanel → dropped on BlueprintCanvas
2. Node selection → opens DetailPanel for editing
3. Task management:
   - Drag grip handles to manually reorder tasks
   - Click "Auto-order" to use AI for intelligent task sequencing
   - Type 3+ characters to see autocomplete suggestions from inputs/outputs
4. Integration configuration → click "Details" → IntegrationDetailsDialog opens
5. Export → JSON (.blueprint.json), Excel (.xlsx), or PDF (.pdf) with diagram visualization

### Smart Import (AI-Powered)
1. Click "Smart Import" button in header
2. Upload PDF, Word, or text document describing a process
3. Configure API key (stored in localStorage, base64 encoded)
4. Select options: optimization goal, granularity
5. Claude API generates blueprint JSON from document
6. Auto-layout algorithm positions nodes
7. Generated blueprint loads into canvas with AI metadata

## Canvas & Navigation

### Canvas Features
- **Drag-and-Drop**: Drag templates from left panel onto canvas
- **Snap to Grid**: 15px grid for alignment
- **Auto-Center**: Automatically centers on first trigger node when opening blueprint
- **Smooth Edges**: Animated smoothstep edges between nodes
- **Pan & Zoom**: Mouse drag to pan, scroll to zoom
- **Node Selection**: Click node to open DetailPanel, click canvas to deselect

### MiniMap
- Located in bottom-right corner
- **Pannable**: Click and drag on minimap to navigate the canvas quickly
- **Zoomable**: Scroll on minimap to zoom in/out
- **Color-coded by node type**: Trigger=Green, Work=Blue, Decision=Amber, End=Red, Workflow=Purple
- **Mask overlay**: Shows viewport position with semi-transparent overlay

## Export Formats

### Excel Export Structure

Excel exports (.xlsx) include multiple sheets:

1. **Metadata**: Blueprint title, description, version, status, authors, dates, audiences, benefits, contacts
2. **Nodes**: All nodes with ID, name, type, sub-type, goal/description, inputs, tasks, outputs, integrations, position
3. **Connections**: Edge relationships with source, target, condition labels, descriptions
4. **Integration Details**: Detailed integration config with node ID, integration name, action, I/O mappings, API endpoints
5. **Comments**: Node comments with author, timestamp, text, resolved status (if any)
6. **Change Log**: Version history with timestamp, author, description (if any)

### PDF Export Structure

PDF exports (.pdf) provide professional client-ready documentation:

1. **Title Page**: Blueprint name, version, status, and description
2. **Blueprint Information**: Metadata including created by, modified by, dates, impacted audiences, business benefits, client contacts
3. **Process Flow Diagram**: Full visual diagram of all nodes and connections captured from canvas
4. **Process Flow Nodes**: Detailed breakdown organized by type:
   - Triggers (name, type, description, configuration)
   - Work Nodes (worker type, goal, inputs, tasks as bullets, outputs, integrations)
   - Decision Points (description, branch labels)
   - Sub-Workflows (workflow name, version, description)
   - End Points (outcome)
5. **Process Connections**: Table showing all node connections with conditions
6. **Integration Details**: Detailed integration configurations with actions and API endpoints
7. **Comments**: Table of all comments with node, author, date, text, and resolution status (if any)
8. **Change Log**: Version history with dates, authors, and descriptions (if any)

### JSON Export

JSON exports (.blueprint.json) provide full data for re-import:
- Complete blueprint data structure
- All nodes, edges, metadata, comments, change log
- Version information and export timestamp

## Blueprint Library (HomePage)

### Features
- **Card-Based Display**: Each blueprint shown as a card with title, description, metadata
- **Search**: Filter blueprints by title, description, owner, or status
- **Status Badges**: Color-coded badges (Draft=gray, In Review=blue, Approved=green, Archived=amber)
- **Quick Stats**: Shows node count and last modified date per blueprint
- **Actions**: Click card to open editor, create new blueprint with "New Blueprint" button
- **Empty States**: Helpful messages when no blueprints exist or search returns no results
- **Hero Section**: Value proposition with three benefit cards (Shared Understanding, Identify Gaps, Create Champions)

### Library Management
- Stored in `blueprintsLibraryStore` using Zustand with persistence middleware
- Uses Map<string, Blueprint> for efficient lookup by ID
- Auto-sorts by last modified date (descending)
- Supports CRUD operations: create, read, update, delete
- Import blueprints from JSON files adds them to library

## Template Categories

1. **Triggers** (3): Event-Based, Scheduled, Manual
2. **AI Agents** (5): Data Retrieval, Document Generation, Triage & Routing, Validation, Communication
3. **Automations** (4): System Sync, Scheduled Report, Status Update, File Processing
4. **Human Tasks** (4): Approval Gate, Exception Handler, Quality Review, Data Entry
5. **Workflows** (4): Sub-Workflow, Validation Workflow, Approval Workflow, Notification Workflow
6. **Flow Control** (3): Decision Point, Success End, Failure End

Note: All Work node templates now include detailed IntegrationDetail objects with meaningful action descriptions.

## Architecture Notes

- **Multi-page SPA** with React Router (HomePage + BlueprintEditor routes)
- **Library Store** (`blueprintsLibraryStore`) manages multiple blueprints with Map<id, Blueprint>
- `AppNode` type is `Node<NodeData>` for React Flow compatibility
- Node data extends `Record<string, unknown>` for React Flow
- `IOItem` type: `{ name: string; required: boolean }` for inputs/outputs
- **Integration Migration**: Union type `Array<string | IntegrationDetail>` supports backward compatibility
  - `migrateIntegrations()` auto-converts old string[] to new detailed format
  - Migration happens transparently on read (DetailPanel, export utilities)
- Comments are stored per-node and included in exports
- Blueprint metadata includes version, status, change log
- Detail panel width: 512px (w-[32rem]) - 33% wider for better task visibility
- **Auto-save**: 1s debounce to library store (previously 2s to localStorage)
- **Auto-center**: Canvas automatically centers on first trigger node on blueprint load
- **Task Management**: ListEditor uses @hello-pangea/dnd for drag-and-drop, useTaskAutoOrder hook for AI reordering

## Recent Updates

### Enhanced Task Management & Decision Nodes
- **AI-Powered Task Auto-Ordering**:
  - Click "Auto-order" button on task lists (appears when 2+ tasks exist)
  - Uses Claude Opus 4.5 to intelligently reorder tasks based on goal, inputs, outputs, and dependencies
  - Considers logical execution flow and data dependencies
- **Manual Task Reordering**:
  - Drag-and-drop tasks using grip handles
  - Visual feedback during dragging
- **Task Autocomplete**:
  - Type 3+ characters in task fields to trigger autocomplete
  - Shows dropdown of matching input/output names
  - Keyboard navigation (arrow keys, enter, escape)
  - Click to insert suggestion
- **Multi-line Tasks**: Tasks now use textareas instead of single-line inputs for better readability
- **Multiple Decision Branches**:
  - Decision nodes support 2+ branches (not limited to Yes/No)
  - Dynamic handle positioning for 2, 3, 4+ branches
  - Color-coded handles (green/red for 2, blue/purple/orange/pink/teal/indigo for 3+)
  - Each branch has customizable label and optional description
  - "Add Branch" button to add more criteria
  - Minimum 2 branches enforced

### PDF Export with Diagram Visualization
- **Professional PDF Export**:
  - Full blueprint documentation in client-ready PDF format
  - Includes visual diagram captured from canvas using html2canvas
  - Comprehensive sections: title page, metadata, diagram, nodes, connections, integrations, comments, change log
  - Automatic scaling of diagram to fit PDF page
  - Export from Export dialog alongside JSON and Excel options
- **Canvas Capture**:
  - High-quality diagram rendering at 1.5x scale
  - Captures full React Flow canvas with all nodes and connections
  - Maintains node colors and styling in PDF

### Multi-Page App with Blueprint Library (v0.1.0)
- **HomePage**: Landing page with blueprint library, search, and card-based display
- **BlueprintCard**: Shows title, description, status badge, node count, last modified
- **Library Store**: Manages multiple blueprints with persistent localStorage storage
- **Navigation**: React Router with `/` (home) and `/blueprint/:id` (editor) routes
- **Auto-save**: Blueprints auto-save to library every 1 second

### Enhanced Integration Management
- **IntegrationDetailsDialog**: Full-featured modal for configuring integrations
  - Name and action summary (required)
  - Input/Output mappings with checkboxes from node I/O
  - Description and database field per mapping
  - Multiple API endpoints with URL + HTTP method (GET/POST/PUT/DELETE/PATCH)
- **Backward Compatible**: Old string[] integrations auto-migrate via `migrateIntegrations()`
- **Excel Export**: New "Integration Details" sheet with all integration data
- **Updated Templates**: All 14 Work node templates now use detailed integration format

### Smart Import Feature (AI-Powered)
- **Document Upload**: Supports PDF, Word (.docx), and plain text files with extensive debug logging
- **Claude API Integration**: Generates blueprints from process descriptions
- **Customizable Prompts**: Edit system and user prompts to incorporate best practices
  - Placeholder support for dynamic content injection
  - Reset to defaults option
  - Persistent custom prompts in localStorage
- **Options**: Optimization goals (speed, accuracy, collaboration) and granularity (high-level, detailed, comprehensive)
- **Enhanced Auto-layout**:
  - BFS-based algorithm with cycle detection
  - 10-second timeout protection
  - Fallback grid layout for resilience
  - Comprehensive logging throughout process
- **API Key Management**:
  - Secure localStorage storage with base64 encoding
  - Format validation (must start with 'sk-ant-')
  - Test Connection feature for pre-flight validation
- **Robust Error Handling**:
  - 90-second API timeout with clear feedback
  - Enhanced error messages (network, CORS, auth, timeout)
  - Cancel Generation button during processing
  - Graceful fallback when layout fails
- **Progress Tracking**: Step-by-step UI with file processing, API call, and layout stages

### Canvas Auto-Centering
- **First Trigger Focus**: Canvas automatically centers on first trigger node when blueprint opens
- **Smooth Animation**: 800ms animated pan for better UX
- **One-Time**: Only happens on blueprint load, not on every change

### Previous Features
- Workflow node type for referencing other workflows
- Inputs and Outputs support required/optional flags via IOListEditor
- Decision nodes with customizable branch labels (now enhanced to support 2+ branches)
- MiniMap with pan/zoom capabilities
- Color-coded nodes: Agent=Orange, Automation=Yellow, Human=Blue, Workflow=Purple, Trigger=Green
- Task list with simple string inputs (now enhanced with drag-and-drop, auto-order, and autocomplete)
