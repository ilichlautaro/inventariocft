/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines to build custom structured elements
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${key}`} className="list-disc pl-6 my-3 space-y-2 text-slate-700">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm font-sans leading-relaxed">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (key: number) => {
    if (tableRows.length > 0) {
      // Determine headers vs normal rows
      const hasHeaders = tableRows.length > 1 && tableRows[1]?.[0]?.includes('---');
      const filteredRows = hasHeaders 
        ? tableRows.filter((_, idx) => idx !== 1) // skip the alignment row
        : tableRows;

      renderedElements.push(
        <div key={`table-${key}`} className="overflow-x-auto my-4 rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700 font-sans">
            <thead className="bg-slate-50 text-slate-800 font-semibold">
              <tr>
                {hasHeaders ? (
                  tableRows[0].map((th, i) => (
                    <th key={i} className="px-4 py-3 font-medium uppercase text-xs tracking-wider">{th.trim()}</th>
                  ))
                ) : (
                  filteredRows[0]?.map((_, i) => (
                    <th key={i} className="px-4 py-3">Columna {i + 1}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(hasHeaders ? filteredRows.slice(1) : filteredRows).map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5 text-slate-600 font-sans whitespace-normal font-medium text-xs leading-relaxed">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const parseInlineFormats = (text: string) => {
    // Basic bold **text** parsing
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if it's a table row (| Column | Column |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(index);
      inTable = true;
      const cells = trimmed.split('|').slice(1, -1);
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(index);
    }

    // Check if it's a list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.substring(2));
      return;
    } else if (inList) {
      flushList(index);
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={index} className="text-md font-bold text-slate-900 mt-5 mb-2 font-sans flex items-center gap-1 border-l-4 border-emerald-500 pl-2">
          {parseInlineFormats(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={index} className="text-lg font-bold text-slate-900 mt-6 mb-3 font-sans border-b border-slate-100 pb-1 text-indigo-900">
          {parseInlineFormats(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={index} className="text-xl font-bold text-indigo-950 mt-8 mb-4 font-sans tracking-tight border-b-2 border-indigo-200 pb-2">
          {parseInlineFormats(trimmed.substring(2))}
        </h2>
      );
    } else if (trimmed === '') {
      // Empty line, spacing
      renderedElements.push(<div key={index} className="h-2" />);
    } else {
      // Regular paragraph
      renderedElements.push(
        <p key={index} className="text-sm text-slate-700 leading-relaxed my-2 font-sans">
          {parseInlineFormats(trimmed)}
        </p>
      );
    }
  });

  // Flush remaining blocks
  if (inList) flushList(lines.length);
  if (inTable) flushTable(lines.length);

  return (
    <div className="space-y-1 select-text selection:bg-indigo-100">
      {renderedElements}
    </div>
  );
}
