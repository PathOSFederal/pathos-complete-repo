'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleDetailProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleDetail({
  id,
  title,
  children,
  defaultOpen = false,
}: CollapsibleDetailProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className="rounded-xl border border-[#1f2937] bg-[#0b1016] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-[#0f1620] transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
        )}
        {title}
      </button>
      {open && (
        <div className="border-t border-[#1f2937]">
          {children}
        </div>
      )}
    </div>
  );
}
