'use client';

/**
 * MarkdownEditor
 * 
 * Interactive Markdown editor with quick toolbar buttons (bold, italic, header, lists,
 * code blocks, quotes, tables) and live preview toggle.
 */

import React, { useState, useRef } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write proposal description in markdown...',
  minHeight = 'min-h-[260px]',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultPlaceholder;

    const before = value.substring(0, start);
    const after = value.substring(end);
    const replacement = `${prefix}${selected}${suffix}`;

    const newValue = `${before}${replacement}${after}`;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-inner">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-2 text-xs">
        {/* Formatting Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton onClick={() => insertFormatting('**', '**', 'bold text')} title="Bold">
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('*', '*', 'italic text')} title="Italic">
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('### ', '\n', 'Heading')} title="Heading">
            <span className="font-semibold">H3</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('`', '`', 'code')} title="Inline Code">
            <code>{'<>'}</code>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('```rust\n', '\n```', '// code block')} title="Code Block">
            <span>{'{ }'}</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('- ', '\n', 'List item')} title="Bullet List">
            <span>• List</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('1. ', '\n', 'Numbered item')} title="Numbered List">
            <span>1. List</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertFormatting('> [!NOTE]\n> ', '\n', 'Important context')} title="Alert Box">
            <span>ℹ Alert</span>
          </ToolbarButton>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-800 p-0.5">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'write' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'preview' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview Content */}
      <div className="p-4">
        {mode === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full resize-y bg-transparent font-mono text-sm text-slate-200 placeholder-slate-500 focus:outline-none ${minHeight}`}
          />
        ) : (
          <div className={`${minHeight} overflow-y-auto`}>
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm italic text-slate-500">Nothing to preview yet. Switch to Write mode to add content.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-white/5 bg-slate-800/80 px-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      {children}
    </button>
  );
}
