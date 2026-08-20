'use client';

/**
 * MarkdownRenderer
 * 
 * Safely parses and renders Markdown formatted text directly into React nodes,
 * avoiding dangerouslySetInnerHTML. Supports headers, bold, italic, inline code,
 * fenced code blocks, alerts, blockquotes, and lists.
 */

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function parseInlineToReact(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  // Match tokens: `code`, **bold**, *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-inline-${idx}`;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={key} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={key} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const key = `list-${elements.length}`;
      if (listType === 'ul') {
        elements.push(
          <ul key={key} className="my-3 space-y-1">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="my-3 space-y-1">
            {listItems}
          </ol>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock) {
      const key = `code-${elements.length}`;
      elements.push(
        <div key={key} className="my-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5 text-slate-400">
            <span>{codeBlockLang || 'code'}</span>
          </div>
          <pre className="p-4 text-emerald-400 overflow-x-auto">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        </div>
      );
      codeBlockLines = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineKey = `line-${i}`;

    // Fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // GitHub Alerts: > [!NOTE] or > [!IMPORTANT] or > [!WARNING]
    if (line.trim().startsWith('> [!')) {
      flushList();
      const match = line.trim().match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      const alertType = match ? match[1].toUpperCase() : 'NOTE';

      let borderClass = 'border-sky-500/30 bg-sky-500/10 text-sky-200';
      let title = 'Note';
      if (alertType === 'IMPORTANT' || alertType === 'TIP') {
        borderClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
        title = 'Important';
      } else if (alertType === 'WARNING' || alertType === 'CAUTION') {
        borderClass = 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        title = 'Warning';
      }

      const alertContent: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        alertContent.push(lines[i].replace(/^>\s?/, ''));
      }

      elements.push(
        <div key={lineKey} className={`my-4 rounded-xl border ${borderClass} p-4`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <p className="text-sm leading-relaxed">{parseInlineToReact(alertContent.join(' '), lineKey)}</p>
        </div>
      );
      continue;
    }

    // Standard Blockquotes
    if (line.trim().startsWith('>')) {
      flushList();
      const quoteText = line.replace(/^>\s?/, '');
      elements.push(
        <blockquote key={lineKey} className="my-3 border-l-4 border-slate-600 pl-4 italic text-slate-300">
          {parseInlineToReact(quoteText, lineKey)}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={lineKey} className="mt-6 mb-2 text-lg font-bold text-white">
          {parseInlineToReact(line.slice(4), lineKey)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={lineKey} className="mt-8 mb-3 text-xl font-bold text-white border-b border-white/10 pb-2">
          {parseInlineToReact(line.slice(3), lineKey)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={lineKey} className="mt-8 mb-4 text-2xl font-extrabold text-white">
          {parseInlineToReact(line.slice(2), lineKey)}
        </h1>
      );
      continue;
    }

    // Unordered lists
    if (line.trim().match(/^[-*]\s+/)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const itemText = line.trim().replace(/^[-*]\s+/, '');
      const itemKey = `item-${listItems.length}`;
      listItems.push(
        <li key={itemKey} className="ml-4 list-disc text-slate-300 my-1">
          {parseInlineToReact(itemText, itemKey)}
        </li>
      );
      continue;
    }

    // Ordered lists
    if (line.trim().match(/^\d+\.\s+/)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      const itemText = line.trim().replace(/^\d+\.\s+/, '');
      const itemKey = `item-${listItems.length}`;
      listItems.push(
        <li key={itemKey} className="ml-4 list-decimal text-slate-300 my-1">
          {parseInlineToReact(itemText, itemKey)}
        </li>
      );
      continue;
    }

    // Regular line
    flushList();
    const trimmed = line.trim();
    if (trimmed) {
      elements.push(
        <p key={lineKey} className="my-2 leading-relaxed text-slate-300 text-sm">
          {parseInlineToReact(trimmed, lineKey)}
        </p>
      );
    }
  }

  flushList();
  flushCodeBlock();

  return <div className={`prose prose-invert max-w-none space-y-3 ${className}`}>{elements}</div>;
}
