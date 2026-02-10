# Agent Blueprint Builder

> A React-based visual workflow designer for creating and managing business process blueprints that distribute work across AI Agents, Automations, Humans, and reusable Workflows.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## ✨ Features

### 🎨 Visual Blueprint Designer
- **Drag-and-drop canvas** powered by React Flow
- **Multiple node types**: Triggers, Work (Agent/Automation/Human), Decisions, End Points, Workflows
- **Multi-branch decision nodes** with customizable labels and dynamic handle positioning
- **4-sided connection handles** for flexible workflow design
- **Auto-centering** on first trigger node when opening blueprints
- **MiniMap** with pan and zoom for easy navigation

### 🤖 AI-Powered Smart Import
Generate blueprints automatically from process documentation:
- **Multi-format support**: PDF, Word (.docx), and plain text files
- **Customizable prompts** with placeholder system for incorporating best practices
- **Claude API integration** (Sonnet 4.5) for intelligent blueprint generation
- **Robust auto-layout** with BFS algorithm, cycle detection, and fallback grid positioning
- **Test Connection** feature to validate API key before generation
- **Enhanced error handling** with detailed logging and user feedback

### 📋 Task Management
- **AI-powered task auto-ordering** using Claude Opus 4.5
- **Manual drag-and-drop** reordering with visual feedback
- **Autocomplete** suggestions from inputs/outputs (type 3+ characters)
- **Multi-line task descriptions** for better readability

### 🔗 Integration Management
- **Detailed integration configuration** with modal dialog
- **Input/Output mappings** with descriptions and database field mappings
- **API endpoint management** with URL and HTTP method configuration
- **Backward compatible** with automatic migration from simple string lists

### 📤 Multiple Export Formats
- **PDF**: Professional client-ready documentation with visual diagrams
- **Excel**: Multi-sheet workbooks (Metadata, Nodes, Connections, Integration Details, Comments, Change Log)
- **JSON**: Full blueprint data for re-import

### 📚 Blueprint Library
- **Multi-blueprint management** with card-based display
- **Search and filter** by title, description, owner, or status
- **Status badges**: Draft, In Review, Approved, Archived
- **Auto-save** to localStorage (1-second debounce)
- **Quick stats**: Node count and last modified date per blueprint

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (usually http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Canvas**: React Flow v12 (@xyflow/react)
- **State Management**: Zustand with persistence middleware
- **Styling**: Tailwind CSS v4
- **Exports**: SheetJS (xlsx), jsPDF + jspdf-autotable, html2canvas
- **Testing**: Vitest
- **AI Integration**: Anthropic Claude API (Sonnet 4.5 & Opus 4.5)

## 📖 Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation including:
- Project structure and key files
- Node types and features
- Data flow and architecture
- Template categories
- Validation rules
- Recent updates and changelog

## 🎯 Use Cases

- **Business Process Design**: Visualize end-to-end business processes
- **AI Agent Orchestration**: Design workflows that combine AI agents, automations, and human tasks
- **Process Documentation**: Generate professional PDFs for stakeholders
- **Workflow Analysis**: Identify gaps, bottlenecks, and optimization opportunities
- **Team Collaboration**: Share blueprints with teams and stakeholders

## 🔑 AI Features Setup

To use AI-powered features (Smart Import and Task Auto-ordering):

1. Get an API key from [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Click "Smart Import" or configure API key in settings
3. Enter your API key (stored securely in browser localStorage)
4. Use Test Connection to verify before generating

## 📝 Node Types

| Type | Color | Use Case |
|------|-------|----------|
| **Trigger** | Green | Process entry points (event, scheduled, manual) |
| **Work (Agent)** | Orange | AI agent tasks |
| **Work (Automation)** | Yellow | Automated system tasks |
| **Work (Human)** | Blue | Human-performed tasks |
| **Decision** | Amber | Branching logic (2+ branches with custom labels) |
| **End** | Red | Process termination points |
| **Workflow** | Purple | Reference to another workflow/blueprint |

## 🏗️ Project Structure

```
src/
├── components/         # UI components (canvas, nodes, panels, dialogs)
├── features/
│   └── smartImport/   # AI-powered blueprint generation
├── store/             # Zustand state stores
├── hooks/             # Custom React hooks
├── utils/             # Utilities (validation, export, import)
├── types/             # TypeScript type definitions
├── data/              # Templates and default data
└── constants/         # App constants and configuration
```

## 🤝 Contributing

Contributions are welcome! This project was built with [Claude Code](https://claude.com/claude-code).

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with assistance from Claude Sonnet 4.5 via [Claude Code](https://claude.com/claude-code).

---

**Made with ❤️ and 🤖 AI**
