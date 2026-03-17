# Contributing to Agent Blueprint Builder

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # Vitest in watch mode
npm run build    # Production build check
```

---

## File Structure

```
src/
├── components/
│   ├── canvas/          # BlueprintCanvas (React Flow wrapper)
│   ├── dialogs/         # Modal dialogs (Export, Import, APIDiscovery, AIPromptAdmin)
│   ├── layout/          # AppLayout, Header
│   ├── nodes/           # Custom React Flow node renderers
│   ├── pages/           # HomePage, BlueprintEditor, BlueprintCard
│   ├── panels/
│   │   ├── node-panels/ # Per-node-type editing panels (Work, Trigger, Decision, End, Workflow)
│   │   └── ...          # DetailPanel (orchestrator), TemplatePanel, ValidationPanel
│   └── shared/          # Reusable UI: Modal, ListEditor, IOListEditor
├── features/
│   └── smartImport/     # Self-contained AI import feature (hooks, utils, components, types)
├── hooks/               # App-wide custom hooks
├── store/               # Zustand stores (one file per concern)
├── types/               # TypeScript interfaces and type guards
├── utils/               # Pure utility functions (validation, export, import, storage)
├── data/                # Static templates
└── constants/           # App-wide constants and colors
```

---

## Adding a New Hook

All AI hooks follow the same pattern. Use this as a template:

```typescript
import { useState, useCallback } from 'react';
import { getApiKey } from '../features/smartImport/hooks/useClaudeApi';
import { getActivePrompts } from '../utils/aiPromptStorage';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60000;

/**
 * Hook for [describe what it does].
 *
 * @returns {{ myAction, isLoading, error, clearError }}
 */
export function useMyFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myAction = useCallback(async (params: MyParams) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('API key not found. Please configure your Claude API key in Smart Import settings.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Build prompts from centralized storage (supports user customization)
    const prompts = getActivePrompts('myFeatureKey');
    const userPrompt = prompts.userPromptTemplate
      .replace('{{PLACEHOLDER}}', params.value);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: prompts.systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (!content) throw new Error('No content in API response');

      // Parse and validate the response...
      setIsLoading(false);
      return parsedResult;
    } catch (err) {
      clearTimeout(timeoutId);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { myAction, isLoading, error, clearError };
}
```

**After creating the hook**, register its prompts in `src/utils/aiPromptStorage.ts`:
1. Add the feature key to the `AIFeatureKey` union type
2. Add a config entry to `getFeatureConfigs()`
3. Add default prompts to `DEFAULT_PROMPTS`

---

## Adding a New Node Type

1. **Add the type** to `src/types/nodes.ts` — extend the `NodeData` union and add a type guard (`isMyNode`)
2. **Add factory function** — `createMyNodeData()` in `src/types/nodes.ts`
3. **Add a renderer** — create `src/components/nodes/MyNode.tsx` extending `BaseNode`
4. **Register the renderer** — add to the `nodeTypes` map in `src/components/canvas/BlueprintCanvas.tsx`
5. **Add an editing panel** — create `src/components/panels/node-panels/MyNodePanel.tsx`
6. **Wire it in** — add a branch to `DetailPanel.tsx`
7. **Add templates** — add entries to `src/data/templates.ts`
8. **Add a color** — add to `src/constants/colors.ts`
9. **Update validation** — extend rules in `src/utils/validation.ts` if needed

---

## Adding a New Component

- Place reusable UI in `src/components/shared/`
- Place feature-specific dialogs in `src/components/dialogs/`
- Place node-type editing panels in `src/components/panels/node-panels/`
- Export props interfaces from the component file (not a separate types file)
- Add JSDoc to the component function explaining its purpose and any non-obvious props

---

## State Management

The app uses **six separate Zustand stores** — keep them independent:

| Store | Contents |
|-------|----------|
| `nodesStore` | React Flow nodes, addNode, updateNode, removeNode |
| `edgesStore` | React Flow edges |
| `blueprintStore` | Blueprint metadata (title, status, version, changeLog) |
| `uiStore` | Selected node, open dialogs, UI flags |
| `commentsStore` | Per-node comments |
| `blueprintsLibraryStore` | Multi-blueprint library with localStorage + Supabase sync |

- Read state with selectors: `useNodesStore((state) => state.nodes)`
- Do **not** import one store inside another
- For cross-store operations (e.g., load a full blueprint), use `useLocalStorage` hook

---

## Storage Architecture

Blueprints are persisted in two tiers:

1. **localStorage** — immediate, synchronous. Used for current session and offline support.
2. **Supabase** — background sync for cross-device access. Managed by `blueprintsLibraryStore`.

AI prompt customizations are stored separately in localStorage under `blueprint-builder:ai-prompts:<feature>` with a 20,000 character limit per field.

---

## Testing Conventions

Tests live alongside source files or in `src/utils/*.test.ts`. The project uses **Vitest**.

```bash
npm run test          # Watch mode
npm run test -- --run # Single run (CI)
```

- Unit tests: focus on `src/utils/` (validation, import, export logic)
- E2E tests: live in `e2e/` and use Playwright (`npm run test:e2e`)
- When adding a new validation rule, add a corresponding test in `validation.test.ts`
- Helper factories for test nodes are in `src/utils/validation.test.ts` — reuse them

---

## Debugging AI API Calls

All AI features require a Claude API key configured via the Smart Import dialog.

**Common issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| "API key not found" | Key not set | Open Smart Import → enter key starting with `sk-ant-` |
| 401 error | Invalid key | Regenerate key at console.anthropic.com |
| 429 error | Rate limit | Wait and retry; check usage at console |
| Request timeout | Document too large or slow connection | Reduce document size or retry |
| JSON parse error | Model returned non-JSON | Check system prompt forces JSON-only output |

**Prompt customization:** All AI prompts can be edited via the "AI Prompts" button on the HomePage. Changes persist in localStorage. Click "Reset to Default" to restore originals.

**Adding a new prompt:** Follow the pattern in `src/utils/aiPromptStorage.ts`. Use `{{PLACEHOLDER}}` tokens in templates — they are substituted at call time in the hook.
