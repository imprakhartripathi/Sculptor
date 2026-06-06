const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderInline = (line: string): string =>
  escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');

export const renderMarkdownToHtml = (title: string, markdown: string): string => {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    blocks.push(`<p>${paragraphBuffer.map(renderInline).join(" ")}</p>`);
    paragraphBuffer = [];
  };

  const flushList = (): void => {
    if (!inList) {
      return;
    }

    blocks.push(`</ul>`);
    inList = false;
  };

  const flushCode = (): void => {
    if (!inCodeBlock) {
      return;
    }

    blocks.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    codeBuffer = [];
    inCodeBlock = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h1>${renderInline(line.slice(2).trim())}</h1>`);
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${renderInline(line.slice(3).trim())}</h2>`);
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${renderInline(line.slice(4).trim())}</h3>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (!inList) {
        blocks.push("<ul>");
        inList = true;
      }
      blocks.push(`<li>${renderInline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111827;
      --panel: #0b1220;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #f59e0b;
      --border: #243041;
    }
    body {
      margin: 0;
      padding: 28px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #101727, #0b1220 68%);
      color: var(--text);
    }
    .wrap {
      max-width: 920px;
      margin: 0 auto;
      background: rgba(11, 18, 32, 0.88);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px 30px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
    }
    h1, h2, h3 {
      color: #fff;
      margin-top: 1.35em;
    }
    h1 { font-size: 2rem; margin-top: 0; }
    p, li { line-height: 1.7; color: var(--text); }
    a { color: #93c5fd; }
    code {
      background: rgba(148, 163, 184, 0.12);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 6px;
      padding: 0.08rem 0.35rem;
    }
    pre {
      overflow: auto;
      background: rgba(15, 23, 42, 0.95);
      color: #e2e8f0;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
    }
    ul {
      padding-left: 1.3rem;
    }
    .accent {
      color: var(--accent);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="accent">SculptorTS Tools</div>
    ${blocks.join("\n")}
  </main>
</body>
</html>`;
};
