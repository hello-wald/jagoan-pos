import React from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

function normalizeListIndent(markdown: string): string {
  const stack: { srcIndent: number; outIndent: number; width: number }[] = [];
  let inFence = false;

  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      const match = /^([ \t]*)([-*+]|\d+[.)])[ \t]+/.exec(line);
      if (!match) return line;

      const srcIndent = match[1].length;
      while (stack.length > 0 && srcIndent <= stack[stack.length - 1].srcIndent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      const outIndent = parent ? parent.outIndent + parent.width : 0;
      stack.push({ srcIndent, outIndent, width: match[0].length - srcIndent });

      return ' '.repeat(outIndent) + line.slice(srcIndent);
    })
    .join('\n');
}

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-4 mb-2 text-base font-bold tracking-tight text-ink first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 mb-2 text-base font-bold tracking-tight text-ink first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3.5 mb-1.5 text-sm font-bold tracking-tight text-ink first:mt-0">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3.5 mb-1.5 text-sm font-bold tracking-tight text-ink first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="my-1">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 flex flex-col gap-1 pl-1">{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className="my-1.5 flex flex-col gap-1 pl-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="ml-4 list-disc pl-0.5 marker:text-ink-2">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic text-ink-2">{children}</em>,
  hr: () => <hr className="my-3 border-line/70" />,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-accent-deep underline underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-line pl-3 text-ink-2">{children}</blockquote>
  ),
  code: ({ children, className }) =>
    className?.startsWith('language-') ? (
      <code className="block text-xs leading-relaxed">{children}</code>
    ) : (
      <code className="rounded bg-line/50 px-1 py-0.5 font-mono text-xs">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-line bg-paper/70 p-3">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-line px-2 py-1 text-left font-bold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-line px-2 py-1 align-top">{children}</td>,
};

export function AiMarkdownMessage({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-[13px] leading-relaxed text-ink [&_ol>li]:list-decimal [&_li>p]:my-0 [&_li_li]:text-xs [&_li_li]:text-ink-2 [&_li_ul>li]:list-[circle]">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {normalizeListIndent(content)}
      </Markdown>
    </div>
  );
}
