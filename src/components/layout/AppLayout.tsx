import type { ReactNode } from 'react';

interface AppLayoutProps {
  header: ReactNode;
  subHeader?: ReactNode;
  leftPanel?: ReactNode;
  canvas: ReactNode;
  rightPanel?: ReactNode;
  footer?: ReactNode;
}

export function AppLayout({
  header,
  subHeader,
  leftPanel,
  canvas,
  rightPanel,
  footer,
}: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 bg-white shrink-0">
        {header}
      </header>

      {/* Sub-header (Blueprint metadata) */}
      {subHeader && <div className="shrink-0">{subHeader}</div>}

      {/* Main content area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {leftPanel && (
          <aside className="w-64 border-r border-gray-200 bg-white overflow-y-auto shrink-0">
            {leftPanel}
          </aside>
        )}

        {/* Canvas area */}
        <div className="flex-1 relative">{canvas}</div>

        {/* Right sidebar */}
        {rightPanel && (
          <aside className="w-[32rem] border-l border-gray-200 bg-white overflow-y-auto shrink-0">
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Footer / Validation panel */}
      {footer && (
        <footer className="border-t border-gray-200 bg-white shrink-0">
          {footer}
        </footer>
      )}
    </div>
  );
}
