# PRD: Parking Lot / Open Items Panel

**Feature Name:** Parking Lot
**Application:** Agent Blueprint Builder
**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Date:** 2026-03-02

---

## 1. Overview

### 1.1 Problem Statement

When designing agentic blueprints, practitioners surface open questions, unresolved decisions, and information gaps in real time. Today there is no structured place to capture these items inside the blueprint itself. Teams resort to side-channel notes (sticky notes, emails, chat messages) that quickly become disconnected from the blueprint, leading to forgotten items and misaligned stakeholders.

### 1.2 Feature Summary

The **Parking Lot** is a persistent, global panel within the Blueprint Editor that lets users log, track, and resolve open items—directly tied to either the overall blueprint or to specific nodes in the workflow. It surfaces as a button in the editor's top-right toolbar area and opens as a slide-out panel, keeping the canvas fully visible while the panel is open.

### 1.3 Goals

- Give practitioners a structured place to capture open questions and pending decisions without leaving the blueprint editor.
- Link open items to specific nodes so context is never lost.
- Make item status visible at a glance—both in the panel and on the canvas (node badges).
- Produce a record that can be exported alongside the rest of the blueprint documentation.

---

## 2. User Stories

| ID | As a… | I want to… | So that… |
|----|--------|------------|----------|
| US-1 | Blueprint author | Open a Parking Lot panel from the editor toolbar | I can log open questions without leaving the canvas |
| US-2 | Blueprint author | Add a new open item with a title, description, owner, status, and optional link to a node | I capture all relevant context in one place |
| US-3 | Blueprint author | Link an open item to a specific node or to the blueprint overall | Reviewers know exactly what part of the process the item relates to |
| US-4 | Blueprint author | Edit any field of an existing open item at any time | I can update details as the item progresses |
| US-5 | Blueprint author | Record a resolution for an item and mark it Resolved | I maintain a decision log inside the blueprint |
| US-6 | Reviewer | See a badge on nodes that have unresolved open items | I know which parts of the blueprint need attention |
| US-7 | Reviewer | Filter the list by status, owner, or linked node | I can focus on the items most relevant to me |
| US-8 | Blueprint author | Click the linked node reference in an item card | The canvas navigates to that node so I can inspect it |
| US-9 | Team lead | Export parking lot items with the rest of the blueprint | Stakeholders receive a complete document including open items |

---

## 3. Functional Requirements

### 3.1 Toolbar Button

- A **"Parking Lot"** button (icon: clipboard or list-check icon) is permanently visible in the top-right area of the Blueprint Editor header, alongside existing controls (Export, Smart Import, etc.).
- When there are **unresolved items** (status ≠ Resolved), the button displays a numeric **badge** showing the count of unresolved items.
- Badge is hidden when count is zero.
- Clicking the button **toggles** the Parking Lot panel open or closed.

### 3.2 Slide-Out Panel

- The panel slides in from the **right side** of the editor, over the canvas (not pushing it).
- Panel width: `384px` (same as DetailPanel default, `w-96`).
- The panel has a sticky header containing:
  - Title: "Parking Lot"
  - Unresolved item count (e.g., "3 open")
  - A **"+ Add Item"** button
  - A **close (×)** button
- Below the header: filter/sort controls (see §3.4).
- Below filters: scrollable list of item cards.
- At the bottom of an empty list: an empty-state illustration and prompt ("No open items yet. Add one to get started.").

### 3.3 Open Item Data Model

Each parking lot item stores the following fields:

```typescript
interface ParkingLotItem {
  id: string;                    // UUID, auto-generated
  title: string;                 // Required. Short label for the item
  description: string;           // Optional. Detailed explanation of the open question or issue
  owner: string;                 // Optional. Free-text name of the responsible person or team
  status: ParkingLotStatus;      // Required. Defaults to "Open"
  resolution: string;            // Optional. Populated when item is resolved; explains the outcome
  linkedNodeId: string | null;   // null = linked to blueprint overall; node ID = linked to a specific node
  createdAt: string;             // ISO timestamp, auto-set on creation
  updatedAt: string;             // ISO timestamp, auto-updated on every save
  resolvedAt: string | null;     // ISO timestamp, auto-set when status changes to "Resolved"
}

type ParkingLotStatus =
  | 'Open'
  | 'In Discussion'
  | 'Awaiting Decision'
  | 'Blocked'
  | 'Resolved';
```

**Status definitions:**

| Status | Meaning |
|--------|---------|
| Open | Item has been logged; no action taken yet |
| In Discussion | Actively being discussed with stakeholders |
| Awaiting Decision | Analysis complete; waiting on a decision-maker |
| Blocked | Cannot progress due to a dependency |
| Resolved | Decision made; resolution recorded |

### 3.4 Filtering and Sorting

Controls appear below the panel header as a compact row:

- **Filter by Status** — dropdown (All, Open, In Discussion, Awaiting Decision, Blocked, Resolved)
- **Filter by Linked Node** — dropdown populated dynamically from all nodes in the current blueprint (see §3.6)
- **Sort** — dropdown (Newest First, Oldest First, Status, Owner A–Z)

Filters are applied client-side and persist only for the current session.

### 3.5 Item Card (Collapsed View)

Each item in the list renders as a card with:

- **Status badge** (color-coded — see §5.1)
- **Title** (bold, truncated to two lines)
- **Owner** (if set, shown as "Owner: Jane Smith")
- **Linked node chip** — shows the node name (or "Blueprint Overall" if `linkedNodeId` is null)
- **Edit** icon button (opens Add/Edit Modal pre-filled with item data)
- **Quick Status** toggle — a small chevron or status pill that lets the user cycle through statuses inline without opening the modal

### 3.6 Add / Edit Modal

Clicking **"+ Add Item"** or the edit icon opens a modal dialog. The modal contains:

#### Fields

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| Title | Text input | Yes | Placeholder: "What is the open question?" |
| Description | Textarea (4 rows) | No | Placeholder: "Provide additional context…" |
| Owner | Text input | No | Placeholder: "Name or team responsible" |
| Status | Select dropdown | Yes | Options: Open, In Discussion, Awaiting Decision, Blocked, Resolved |
| Resolution | Textarea (3 rows) | No | Shown/highlighted when Status = Resolved. Placeholder: "Describe how this was resolved…" |
| Link To | Select dropdown | No | See §3.6.1 — dynamic node list |

#### 3.6.1 "Link To" Dropdown — Dynamic Node Population

The dropdown is built at runtime from the current blueprint's node list:

- **First option (default):** "Blueprint Overall" (value: `null`)
- **Remaining options:** One entry per node, sorted by node type then name. Each option displays:
  - Node type icon (color-coded dot matching node type color)
  - Node name
  - Node type label in muted text (e.g., "Work · Agent")

The list updates automatically if nodes are added or removed from the canvas while the panel is open.

#### Modal Actions

- **Save** — validates required fields (title, status) and saves to the Zustand store. If status changes to Resolved and `resolvedAt` is not set, it is auto-stamped. Closes modal on success.
- **Cancel** — discards changes and closes modal.
- **Delete** (edit mode only) — shows confirmation prompt before removing the item permanently.

### 3.7 Node Badge Indicators

Nodes on the canvas that have **at least one unresolved** parking lot item show a small badge:

- Position: top-left corner of the node card (inside `BaseNode`).
- Appearance: small amber/orange circle with a white exclamation mark or count number.
- Tooltip on hover: "2 open parking lot items" (or similar).
- Badge disappears when all linked items are Resolved.
- Clicking the badge opens the Parking Lot panel filtered to that node's items.

### 3.8 Canvas Navigation from Panel

In an item card, the linked node chip is **clickable**:

- Clicking it closes the panel and centers the canvas on the linked node (using the same `fitView` / `setCenter` approach already used in auto-centering on blueprint load).
- If `linkedNodeId` is null ("Blueprint Overall"), clicking it has no navigation effect (chip is non-interactive or styled as plain text).

### 3.9 Persistence

- Parking lot items are stored **per blueprint** in the same `blueprintsLibraryStore` Zustand store that already persists all blueprint data.
- The store shape for each blueprint gains a new key: `parkingLot: ParkingLotItem[]` (defaults to `[]`).
- Items auto-save alongside blueprint auto-save (1 s debounce, same as existing behavior).

### 3.10 Export Integration

Parking lot items are included in all export formats:

**JSON Export (`.blueprint.json`):**
- `parkingLot` array included in the top-level blueprint JSON object.

**Excel Export (`.xlsx`):**
- New sheet: **"Parking Lot"**
- Columns: `#`, `Title`, `Status`, `Owner`, `Linked Node`, `Description`, `Resolution`, `Created`, `Resolved`

**PDF Export (`.pdf`):**
- New section after "Comments": **"Parking Lot / Open Items"**
- Table with columns: Title, Status, Owner, Linked Node, Description, Resolution

**Word (BRD) Export (`.docx`):**
- New section after Comments: **"Open Items & Parking Lot"**
- Table formatted consistent with the existing BRD table style

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Panel open/close animation ≤ 200 ms. Filter/sort operations are synchronous (no async). |
| Persistence | No data loss on page refresh; items survive browser reload via existing localStorage-backed Zustand persistence. |
| Accessibility | Modal and panel are keyboard-navigable. Focus is trapped in modal while open. Status badge color is not the sole differentiator (icon or label also present). |
| Consistency | UI components (modal, badges, dropdowns) use the same Tailwind CSS v4 tokens and patterns already present in the codebase. |
| Backward Compatibility | Blueprints saved before this feature is introduced load without error; `parkingLot` defaults to `[]` if absent. |

---

## 5. UI / UX Specifications

### 5.1 Status Color Palette

| Status | Badge Color | Tailwind Class |
|--------|------------|----------------|
| Open | Gray | `bg-gray-200 text-gray-700` |
| In Discussion | Blue | `bg-blue-100 text-blue-700` |
| Awaiting Decision | Amber | `bg-amber-100 text-amber-700` |
| Blocked | Red | `bg-red-100 text-red-700` |
| Resolved | Green | `bg-green-100 text-green-700` |

### 5.2 Panel Layout (ASCII Mockup)

```
┌─────────────────────────────────────┐
│  Parking Lot            3 open  [×] │  ← sticky header
│  [+ Add Item]                       │
├─────────────────────────────────────┤
│  Status ▾   Linked Node ▾   Sort ▾  │  ← filter row
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [In Discussion]   ✎             │ │
│ │ Who approves exception routing? │ │
│ │ Owner: Jane Smith               │ │
│ │ 🔵 Triage & Route Agent         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [Open]            ✎             │ │
│ │ SLA thresholds for escalation   │ │
│ │ Owner: —                        │ │
│ │ 🌐 Blueprint Overall            │ │
│ └─────────────────────────────────┘ │
│                                     │
│   (more cards…)                     │
└─────────────────────────────────────┘
```

### 5.3 Add / Edit Modal Layout (ASCII Mockup)

```
┌──────────────────────────────────────────┐
│  Add Open Item                       [×] │
├──────────────────────────────────────────┤
│  Title *                                 │
│  ┌──────────────────────────────────┐    │
│  │ What is the open question?       │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Description                            │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Owner              Status *             │
│  ┌────────────┐     ┌───────────────┐    │
│  │            │     │ Open        ▾ │    │
│  └────────────┘     └───────────────┘    │
│                                          │
│  Link To                                 │
│  ┌──────────────────────────────────┐    │
│  │ 🌐 Blueprint Overall           ▾ │    │
│  │ ● Trigger: Request Received      │    │
│  │ 🟠 Agent: Triage & Route         │    │
│  │ 🔵 Human: Approval Gate          │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Resolution  (shown when Resolved)       │
│  ┌──────────────────────────────────┐    │
│  │ Describe how this was resolved…  │    │
│  └──────────────────────────────────┘    │
├──────────────────────────────────────────┤
│  [Delete]              [Cancel] [Save]   │
└──────────────────────────────────────────┘
```

### 5.4 Node Badge (ASCII Mockup)

```
┌──────────────────────────────────┐
│ ⚠2  🟠 Triage & Route Agent     │  ← amber badge top-left
│      Goal: Route incoming…       │
│      Tasks: 3  |  Inputs: 2      │
└──────────────────────────────────┘
```

---

## 6. Technical Implementation Guide

### 6.1 New Files

| File | Purpose |
|------|---------|
| `src/types/parkingLot.ts` | `ParkingLotItem` interface and `ParkingLotStatus` type |
| `src/store/parkingLotStore.ts` | Zustand store slice (or extension of `blueprintStore`) for CRUD on items |
| `src/components/panels/ParkingLotPanel.tsx` | Slide-out panel component |
| `src/components/dialogs/ParkingLotItemDialog.tsx` | Add/Edit modal component |
| `src/components/shared/ParkingLotBadge.tsx` | Small badge component used inside `BaseNode` |

### 6.2 Modified Files

| File | Change |
|------|--------|
| `src/types/index.ts` (or `blueprint.ts`) | Add `parkingLot: ParkingLotItem[]` to the `Blueprint` type |
| `src/store/blueprintStore.ts` | Include `parkingLot` in default blueprint shape; persist with existing middleware |
| `src/components/layout/Header.tsx` or `BlueprintEditor.tsx` | Add Parking Lot toolbar button with badge |
| `src/components/nodes/BaseNode.tsx` | Render `ParkingLotBadge` when unresolved items are linked to the node |
| `src/utils/export.ts` | Add `parkingLot` sheet to Excel export |
| `src/utils/canvasExport.ts` / PDF export | Add Parking Lot section to PDF |
| `src/utils/exportWord.ts` | Add Open Items section to Word BRD export |
| `src/store/blueprintsLibraryStore.ts` | Ensure `parkingLot: []` default when loading legacy blueprints |

### 6.3 Zustand Store Shape

```typescript
// parkingLotStore.ts (or added to blueprintStore)
interface ParkingLotState {
  items: ParkingLotItem[];
  addItem: (item: Omit<ParkingLotItem, 'id' | 'createdAt' | 'updatedAt' | 'resolvedAt'>) => void;
  updateItem: (id: string, updates: Partial<ParkingLotItem>) => void;
  deleteItem: (id: string) => void;
  getItemsForNode: (nodeId: string | null) => ParkingLotItem[];
  getUnresolvedCount: () => number;
  getUnresolvedCountForNode: (nodeId: string) => number;
}
```

### 6.4 Panel Toggle in UI Store

Add to `uiStore.ts`:

```typescript
isParkingLotOpen: boolean;
toggleParkingLot: () => void;
closeParkingLot: () => void;
```

### 6.5 Dynamic "Link To" Dropdown Population

The dropdown options in `ParkingLotItemDialog` are derived from `useStore` (nodesStore):

```typescript
const nodes = useNodesStore((state) => state.nodes);
const linkOptions = [
  { value: null, label: 'Blueprint Overall', icon: 'globe' },
  ...nodes.map((n) => ({
    value: n.id,
    label: n.data.name || 'Unnamed Node',
    type: n.type,
    subType: n.data.workerType,
  })),
];
```

This ensures the dropdown always reflects the current canvas state.

### 6.6 Node Badge Integration in BaseNode

Inside `BaseNode.tsx`, read unresolved count from the store:

```typescript
const unresolvedCount = useParkingLotStore(
  (state) => state.getUnresolvedCountForNode(id)
);

// Render in JSX:
{unresolvedCount > 0 && (
  <ParkingLotBadge count={unresolvedCount} onClick={handleBadgeClick} />
)}
```

`handleBadgeClick` dispatches `openParkingLot()` and sets a node filter to `id` in the panel's filter state.

---

## 7. Phased Implementation Plan

### Phase 1 — Core Functionality (MVP)

- `ParkingLotItem` type definition
- `parkingLotStore` with add/update/delete
- Parking Lot toolbar button (no badge yet)
- `ParkingLotPanel` with item list and empty state
- `ParkingLotItemDialog` with all fields including dynamic "Link To" dropdown
- Basic status badges on item cards
- Persistence via blueprintStore

### Phase 2 — Canvas Integration

- Unresolved item count badge on toolbar button
- `ParkingLotBadge` on nodes with unresolved items
- Click badge → open panel filtered to that node
- Click linked-node chip in card → navigate canvas to that node

### Phase 3 — Filtering, Sorting & Search

- Filter by Status dropdown
- Filter by Linked Node dropdown
- Sort control (newest, oldest, status, owner)
- Text search bar in panel header

### Phase 4 — Export Integration

- Parking Lot sheet in Excel export
- Parking Lot section in PDF export
- Open Items section in Word BRD export
- `parkingLot` array in JSON export

---

## 8. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | A "Parking Lot" button is visible in the Blueprint Editor toolbar at all times |
| AC-2 | The button shows a numeric badge equal to the count of items whose status ≠ Resolved; badge is hidden when count is 0 |
| AC-3 | Clicking the button opens/closes the Parking Lot panel without disrupting the canvas |
| AC-4 | A user can create an item with only Title + Status and save successfully |
| AC-5 | The "Link To" dropdown lists all current blueprint nodes plus "Blueprint Overall"; the list updates if nodes are added/removed |
| AC-6 | Setting Status to "Resolved" reveals the Resolution field; `resolvedAt` is auto-stamped on save |
| AC-7 | Nodes with at least one unresolved linked item show a visible badge; nodes with zero unresolved items show no badge |
| AC-8 | Clicking the linked-node chip in a panel card navigates the canvas to center on that node |
| AC-9 | All items persist across page refresh |
| AC-10 | Parking lot items appear in Excel, PDF, Word, and JSON exports |
| AC-11 | Legacy blueprints without `parkingLot` data load without error and default to an empty list |

---

## 9. Out of Scope (v1.0)

- Due dates or reminder notifications
- @mention or user assignment beyond free-text owner field
- Activity / audit history per item
- Bulk status changes
- Real-time multi-user collaboration
- Priority field (may be added in a future iteration)
- Attachments or file uploads on items

---

## 10. Open Questions (Meta)

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should the Parking Lot panel coexist with the Detail Panel, or should opening one close the other? | UX | Open |
| 2 | Should node badges also appear in the MiniMap? | Engineering | Open |
| 3 | Should "Blueprint Overall" items appear in exports as a separate section from node-linked items? | Product | Open |
