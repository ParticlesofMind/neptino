'use client';

import { TemplateDefinition } from '@/types/template';
import React from 'react';

// ─── Schema → CSS Grid Style converter ──────────────────────
function templateToGridStyle(grid: TemplateDefinition['grid']): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateAreas: grid.areas.map(row => `"${row}"`).join(' '),
    gridTemplateColumns: grid.columns,
    gridTemplateRows: grid.rows,
    gap: grid.gap,
    width: '100%',
    height: '100%',
  };
}

// ─── A4 Page Canvas with zoom ───────────────────────────────
export function PageCanvas({
  template,
  zoom = 1,
  children,
}: {
  template: TemplateDefinition;
  zoom?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-auto bg-gray-200 flex justify-center p-10 min-h-screen">
      <div
        className="bg-white shadow-xl transition-transform duration-200 ease-out origin-top"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '15mm',
          boxSizing: 'border-box',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        <div style={templateToGridStyle(template.grid)} className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
