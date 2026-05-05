import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const skipDirs = new Set(['.git', 'node_modules', 'dist', 'repo', '.flatpak-builder', '.build']);
const markdownFiles: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(fullPath);
    }
  }
}

function skipWhitespace(text: string, startIndex: number) {
  let index = startIndex;
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

function parseMarkdownInlineLinks(text: string) {
  const links: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ']') {
      continue;
    }

    let cursor = i + 1;
    if (text[cursor] !== '(') {
      continue;
    }

    cursor = skipWhitespace(text, cursor + 1);

    let destination = '';

    if (text[cursor] === '<') {
      cursor += 1;
      const start = cursor;

      while (cursor < text.length && text[cursor] !== '>') {
        cursor += 1;
      }

      if (cursor >= text.length) {
        continue;
      }

      destination = text.slice(start, cursor);
      cursor += 1;
    } else {
      const start = cursor;
      let parenDepth = 0;
      let escaped = false;

      while (cursor < text.length) {
        const char = text[cursor];

        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          cursor += 1;
          continue;
        }

        if (char === '(') {
          parenDepth += 1;
          cursor += 1;
          continue;
        }

        if (char === ')') {
          if (parenDepth === 0) {
            break;
          }
          parenDepth -= 1;
          cursor += 1;
          continue;
        }

        if (/\s/.test(char) && parenDepth === 0) {
          break;
        }

        cursor += 1;
      }

      destination = text.slice(start, cursor);
    }

    destination = destination.trim();
    if (!destination) {
      continue;
    }

    cursor = skipWhitespace(text, cursor);

    if (text[cursor] === '"' || text[cursor] === "'" || text[cursor] === '(') {
      const opener = text[cursor];
      const closer = opener === '(' ? ')' : opener;
      cursor += 1;

      let escaped = false;
      while (cursor < text.length) {
        const char = text[cursor];

        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          cursor += 1;
          continue;
        }

        if (char === closer) {
          cursor += 1;
          break;
        }

        cursor += 1;
      }

      cursor = skipWhitespace(text, cursor);
    }

    if (text[cursor] !== ')') {
      continue;
    }

    links.push(destination);
    i = cursor;
  }

  return links;
}

export function main(): number {
  const repoRoot = findProjectRoot();
  walk(repoRoot);

  const missingLinks: Array<{ file: string; link: string; target: string }> = [];

  for (const markdownFile of markdownFiles) {
    const content = fs.readFileSync(markdownFile, 'utf8');
    const links = parseMarkdownInlineLinks(content);

    for (const rawLink of links) {
      if (!rawLink || rawLink.startsWith('#') || rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.startsWith('mailto:')) {
        continue;
      }

      const linkPath = rawLink.split('#', 1)[0].trim();
      if (!linkPath) {
        continue;
      }

      const resolvedPath = linkPath.startsWith('/')
        ? path.resolve(repoRoot, linkPath.slice(1))
        : path.resolve(path.dirname(markdownFile), linkPath);

      if (!fs.existsSync(resolvedPath)) {
        missingLinks.push({
          file: path.relative(repoRoot, markdownFile),
          link: rawLink,
          target: path.relative(repoRoot, resolvedPath),
        });
      }
    }
  }

  if (missingLinks.length === 0) {
    console.log(`[doc-links] OK: checked ${markdownFiles.length} markdown files`);
    return 0;
  }

  console.error(`Found ${missingLinks.length} broken local markdown link(s):`);
  for (const item of missingLinks) {
    console.error(`- ${item.file}: ${item.link} -> ${item.target}`);
  }
  return 1;
}

if (require.main === module && /check-doc-links\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[doc-links] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
