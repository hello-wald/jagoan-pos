import React from 'react';

export function AiMarkdownMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="my-1.5 flex flex-col gap-1 pl-1">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Splits by bold **text** and italics *text*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-ink-2">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Horizontal divider
    if (trimmed === '---' || trimmed === '***') {
      flushList(`list-before-hr-${index}`);
      elements.push(<hr key={`hr-${index}`} className="my-3 border-line/70" />);
      return;
    }

    // Headings: ### or ## or #
    if (trimmed.startsWith('### ')) {
      flushList(`list-before-h3-${index}`);
      elements.push(
        <h4
          key={`h3-${index}`}
          className="mt-3.5 mb-1.5 text-sm font-bold tracking-tight text-ink first:mt-0"
        >
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h4>,
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`list-before-h2-${index}`);
      elements.push(
        <h3
          key={`h2-${index}`}
          className="mt-4 mb-2 text-base font-bold tracking-tight text-ink first:mt-0"
        >
          {renderInline(trimmed.replace(/^##\s+/, ''))}
        </h3>,
      );
      return;
    }

    // Sub-bullet (indented list)
    if (line.startsWith('  * ') || line.startsWith('    * ') || line.startsWith('  - ')) {
      const itemText = line.replace(/^\s+[*|-]\s+/, '');
      listItems.push(
        <li key={`sublist-${index}`} className="ml-5 list-[circle] text-xs text-ink-2 pl-0.5">
          {renderInline(itemText)}
        </li>,
      );
      return;
    }

    // Main Bullet list item (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const itemText = trimmed.replace(/^[*|-]\s+/, '');
      listItems.push(
        <li key={`list-${index}`} className="ml-4 list-disc text-[13px] text-ink leading-relaxed pl-0.5">
          {renderInline(itemText)}
        </li>,
      );
      return;
    }

    // Empty line / paragraph break
    if (!trimmed) {
      flushList(`list-before-empty-${index}`);
      return;
    }

    // Normal paragraph text
    flushList(`list-before-p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-[13px] leading-relaxed text-ink my-1">
        {renderInline(trimmed)}
      </p>,
    );
  });

  flushList('list-final');

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}
