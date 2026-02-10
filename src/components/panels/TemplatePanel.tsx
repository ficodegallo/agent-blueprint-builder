import { Zap, Bot, Cog, User, GitBranch, Workflow } from 'lucide-react';
import { useNodesStore } from '../../store';
import { TEMPLATES, TEMPLATE_CATEGORIES, type NodeTemplate } from '../../data/templates';
import type { NodeData } from '../../types';

const CATEGORY_ICONS = {
  trigger: Zap,
  agent: Bot,
  automation: Cog,
  human: User,
  workflow: Workflow,
  flow: GitBranch,
} as const;

const CATEGORY_COLORS = {
  trigger: 'bg-emerald-500',
  agent: 'bg-orange-500',
  automation: 'bg-yellow-500',
  human: 'bg-blue-500',
  workflow: 'bg-purple-500',
  flow: 'bg-gray-500',
} as const;

interface TemplateButtonProps {
  template: NodeTemplate;
  onClick: () => void;
}

function TemplateButton({ template, onClick }: TemplateButtonProps) {
  const Icon = CATEGORY_ICONS[template.category];
  const color = CATEGORY_COLORS[template.category];

  const handleDragStart = (e: React.DragEvent) => {
    // Store template data for the drop handler
    e.dataTransfer.setData('application/json', JSON.stringify(template.data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left cursor-grab active:cursor-grabbing"
    >
      <div className={`p-1.5 rounded ${color} text-white shrink-0`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 truncate">{template.name}</div>
        <div className="text-xs text-gray-500 truncate">{template.description}</div>
      </div>
    </button>
  );
}

export function TemplatePanel() {
  const addNode = useNodesStore((state) => state.addNode);
  const nodes = useNodesStore((state) => state.nodes);

  // Calculate position for new node to avoid overlap
  const getNewPosition = () => {
    const baseX = 250;
    const baseY = 100;
    const offset = nodes.length * 50;
    return { x: baseX + (offset % 200), y: baseY + Math.floor(offset / 4) * 120 };
  };

  const handleAddTemplate = (template: NodeTemplate) => {
    // Deep clone the template data to avoid mutation
    const nodeData = JSON.parse(JSON.stringify(template.data)) as NodeData;
    addNode(nodeData, getNewPosition());
  };

  return (
    <div className="p-3">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        Node Templates
      </h2>

      <div className="space-y-4">
        {TEMPLATE_CATEGORIES.map((category) => {
          const templates = TEMPLATES.filter((t) => t.category === category.id);
          if (templates.length === 0) return null;

          return (
            <div key={category.id}>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {category.label}
                <span className="text-gray-300">({templates.length})</span>
              </h3>
              <div className="space-y-1">
                {templates.map((template) => (
                  <TemplateButton
                    key={template.id}
                    template={template}
                    onClick={() => handleAddTemplate(template)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick tips */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-xs font-medium text-blue-700 mb-1">Quick Tips</h4>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>Drag templates onto the canvas</li>
          <li>Or click to add at a default position</li>
          <li>Connect nodes by dragging from handles</li>
          <li>Click a node to edit its details</li>
        </ul>
      </div>
    </div>
  );
}
