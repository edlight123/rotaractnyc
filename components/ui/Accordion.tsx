'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export default function Accordion({ items, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn('divide-y divide-gray-200 dark:divide-gray-800', className)} role="region">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `accordion-panel-${item.id}`;
        const headerId = `accordion-header-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={headerId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex items-center justify-between w-full py-5 text-left group"
              >
                <span className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors">
                  {item.title}
                </span>
                <svg
                  className={cn(
                    'w-5 h-5 text-gray-400 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              className={cn(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-96 pb-5' : 'max-h-0'
              )}
            >
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
