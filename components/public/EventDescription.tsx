/**
 * EventDescription
 * ----------------
 * Renders an event description string with sensible formatting:
 *
 *  • Strips stray Unicode replacement chars (U+FFFC, etc.) that often
 *    come from copy-pasting out of Apple Notes / Pages / Word.
 *  • Splits the text into paragraphs on blank lines.
 *  • Preserves single line breaks within a paragraph as <br/>.
 *  • Renders consecutive lines starting with `- `, `* ` or `• ` as a
 *    bulleted list.
 *  • Auto-links URLs, emails, and `@handles` (treated as Instagram).
 *  • Supports lightweight Markdown emphasis: **bold** and *italic*.
 *
 * Output is built entirely from React elements (no dangerouslySetInnerHTML),
 * so it is XSS-safe by construction.
 */

import React from 'react';

interface Props {
  text: string | undefined | null;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Clean and normalise the raw description text.
 *
 * The admin form sometimes saves descriptions as a single line (e.g. when
 * content is pasted from Apple Notes / iOS share sheets which collapse
 * paragraph breaks). To make the output still look reasonable, we
 * heuristically re-inject paragraph breaks before:
 *   • `**Heading**` style bold labels
 *   • Inline bullet markers like ` - ` or ` • `
 * and a hard break between adjacent bullets.
 */
function cleanText(input: string): string {
  let s = input
    // Object replacement char (broken inline-image paste from Apple/Notes)
    .replace(/\uFFFC/g, '')
    // Unicode replacement char
    .replace(/\uFFFD/g, '')
    // Normalize Windows line endings
    .replace(/\r\n?/g, '\n');

  // Recover structure when the whole description was saved as one line.
  // Only do this if there are no existing paragraph breaks already.
  if (!/\n\n/.test(s)) {
    // Insert a blank line before **bold** labels that appear mid-sentence.
    s = s.replace(/\s+(\*\*[^*\n]+\*\*)/g, '\n\n$1');
    // Start a new line for the first inline bullet after sentence-ending
    // punctuation OR after a **bold** label.
    s = s.replace(/([.!?:]|\*\*)[ \t]+-[ \t]+/g, '$1\n- ');
    // Break between adjacent bullets:  "- foo - bar"  →  "- foo\n- bar"
    // Note: trailing separator uses [ \t] not \s — \s would consume the
    // next bullet's leading newline and silently swallow it.
    let prev: string;
    do {
      prev = s;
      s = s.replace(
        /(^|\n)-[ \t]+([^\n-][^\n]*?)[ \t]+-[ \t]+/g,
        '$1- $2\n- ',
      );
    } while (s !== prev);
    // After bullets end (next non-bullet line), force a paragraph break.
    s = s.replace(/(\n- [^\n]+)[ \t]+(?=\*\*|[A-Z])/g, '$1\n\n');
    // Ensure a blank line separates a **heading** line from the bullets
    // that follow it (so the bullets parse as their own list block).
    s = s.replace(/(\*\*[^*\n]+\*\*)\n(?=- )/g, '$1\n\n');
  }

  return s
    // Collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Combined matcher for URLs, emails, and @handles.
// Order matters: emails before bare URLs, handles last.
const LINK_RE =
  /(\bhttps?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])|([\w.+-]+@[\w-]+\.[\w.-]+)|(^|\s)(@[A-Za-z0-9_.]{2,30})/g;

/**
 * Render a single line of text, applying autolinking + **bold** + *italic*.
 * Returns an array of React nodes.
 */
function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  // Step 1: split on **bold** first (greedy-safe with non-greedy match).
  const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
  const nodes: React.ReactNode[] = [];

  boldParts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-b${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {renderItalicAndLinks(part.slice(2, -2), key)}
        </strong>,
      );
    } else {
      nodes.push(...renderItalicAndLinks(part, key));
    }
  });

  return nodes;
}

function renderItalicAndLinks(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  // Split on *italic* (single-asterisk pairs, not part of **).
  const italicParts = text.split(/(?<!\*)\*([^*\n]+)\*(?!\*)/g);
  const out: React.ReactNode[] = [];

  italicParts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-i${i}`;
    // Odd indices are the captured italic content (because of the capture group).
    if (i % 2 === 1) {
      out.push(
        <em key={key} className="italic">
          {renderLinks(part, key)}
        </em>,
      );
    } else {
      out.push(...renderLinks(part, key));
    }
  });

  return out;
}

function renderLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  // Reset regex state (it's defined with /g)
  LINK_RE.lastIndex = 0;

  while ((match = LINK_RE.exec(text)) !== null) {
    const [full, url, email, leading, handle] = match;
    const start = match.index;

    // Push the text before the match.
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const key = `${keyPrefix}-l${i++}`;

    if (url) {
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 underline underline-offset-2"
        >
          {url}
        </a>,
      );
      lastIndex = start + url.length;
    } else if (email) {
      nodes.push(
        <a
          key={key}
          href={`mailto:${email}`}
          className="text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 underline underline-offset-2"
        >
          {email}
        </a>,
      );
      lastIndex = start + email.length;
    } else if (handle) {
      // Preserve any leading whitespace that the regex captured.
      if (leading) nodes.push(leading);
      const h = handle.slice(1); // drop leading '@'
      nodes.push(
        <a
          key={key}
          href={`https://instagram.com/${h}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 underline underline-offset-2"
        >
          {handle}
        </a>,
      );
      lastIndex = start + full.length;
    }
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

// ── Block parser ───────────────────────────────────────────────────────────

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] };

function parseBlocks(text: string): Block[] {
  const paragraphs = text.split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const para of paragraphs) {
    const lines = para.split('\n');
    const isAllBullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));

    if (isAllBullets && lines.length > 0) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, '')),
      });
    } else {
      blocks.push({ type: 'paragraph', lines });
    }
  }

  return blocks;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EventDescription({ text, className }: Props) {
  if (!text || !text.trim()) return null;

  const cleaned = cleanText(text);
  const blocks = parseBlocks(cleaned);

  return (
    <div
      className={`break-words ${
        className ??
        'prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300'
      }`}
    >
      {blocks.map((block, bi) => {
        if (block.type === 'list') {
          return (
            <ul key={`block-${bi}`} className="list-disc pl-6 space-y-1">
              {block.items.map((item, ii) => (
                <li key={`block-${bi}-li-${ii}`}>
                  {renderInline(item, `b${bi}-li${ii}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${bi}`}>
            {block.lines.map((line, li) => (
              <React.Fragment key={`block-${bi}-l${li}`}>
                {renderInline(line, `b${bi}-l${li}`)}
                {li < block.lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
