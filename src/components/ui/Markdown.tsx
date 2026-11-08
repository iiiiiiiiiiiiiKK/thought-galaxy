import type { ReactNode } from 'react';

/**
 * Deliberately tiny Markdown renderer.
 *
 * The app must never inject raw HTML from user content, so this renderer
 * supports a safe subset (headings, lists, quotes, code, emphasis, links,
 * checkboxes) and escapes everything else. It returns React nodes rather than
 * an HTML string, which makes XSS structurally impossible.
 */

function escapeText(text: string): string {
  return text;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))|(\*[^*]+\*)|(_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(escapeText(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${index}`;
    index += 1;
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-sky-300">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-300"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      nodes.push(
        <em key={key} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(escapeText(text.slice(lastIndex)));
  return nodes;
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: Array<{ text: string; checked?: boolean }> = [];
  let listKind: 'ul' | 'ol' | null = null;
  let codeBuffer: string[] | null = null;
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0 || !listKind) return;
    const items = listBuffer.map((item, i) => (
      <li key={`li-${key}-${i}`} className="leading-relaxed">
        {item.checked !== undefined ? (
          <span className="flex items-start gap-2">
            <span
              className={`mt-[0.42em] inline-block h-3 w-3 shrink-0 rounded-[3px] border ${
                item.checked ? 'border-sky-400 bg-sky-400/80' : 'border-slate-500'
              }`}
            />
            <span className={item.checked ? 'text-slate-400 line-through' : ''}>
              {renderInline(item.text, `li-${key}-${i}`)}
            </span>
          </span>
        ) : (
          renderInline(item.text, `li-${key}-${i}`)
        )}
      </li>
    ));
    blocks.push(
      listKind === 'ul' ? (
        <ul key={`ul-${key}`} className="my-3 list-disc space-y-1.5 pl-5 text-slate-300 marker:text-slate-500">
          {items}
        </ul>
      ) : (
        <ol key={`ol-${key}`} className="my-3 list-decimal space-y-1.5 pl-5 text-slate-300 marker:text-slate-500">
          {items}
        </ol>
      ),
    );
    key += 1;
    listBuffer = [];
    listKind = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      if (codeBuffer === null) {
        codeBuffer = [];
      } else {
        blocks.push(
          <pre
            key={`code-${key}`}
            className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-300"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>,
        );
        key += 1;
        codeBuffer = null;
      }
      continue;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (line.trim() === '') {
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'];
      blocks.push(
        <p
          key={`h-${key}`}
          className={`mt-4 mb-2 font-semibold text-slate-100 ${sizes[level - 1]}`}
        >
          {renderInline(headingMatch[2], `h-${key}`)}
        </p>,
      );
      key += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key}`}
          className="my-3 border-l-2 border-sky-500/50 bg-white/[0.03] py-2 pl-3 text-slate-400 italic"
        >
          {renderInline(line.replace(/^>\s?/, ''), `q-${key}`)}
        </blockquote>,
      );
      key += 1;
      continue;
    }

    const checkbox = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    if (checkbox) {
      if (listKind !== 'ul') flushList();
      listKind = 'ul';
      listBuffer.push({ text: checkbox[2], checked: checkbox[1].toLowerCase() === 'x' });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      if (listKind !== 'ul') flushList();
      listKind = 'ul';
      listBuffer.push({ text: bullet[1] });
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      if (listKind !== 'ol') flushList();
      listKind = 'ol';
      listBuffer.push({ text: ordered[1] });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={`hr-${key}`} className="my-4 border-white/10" />);
      key += 1;
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${key}`} className="my-2 leading-relaxed text-slate-300">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
    key += 1;
  }

  if (codeBuffer !== null) {
    blocks.push(
      <pre
        key={`code-${key}`}
        className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-300"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>,
    );
  }
  flushList();

  return <div className={`text-sm ${className}`}>{blocks}</div>;
}

export function plainTextPreview(source: string, length = 140): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}