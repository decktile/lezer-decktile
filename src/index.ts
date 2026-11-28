// SPDX-FileCopyrightText: 2026 Reza Jelveh
//
// SPDX-License-Identifier: Apache-2.0

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { LanguageDescription, type LanguageSupport } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { parseMixed } from "@lezer/common";
import { styleTags, tags as t } from "@lezer/highlight";
import type { BlockContext, Line, MarkdownConfig } from "@lezer/markdown";
import { pdg, pdgLanguage } from "lezer-pdg";

const DIRECTIVE = /^@[A-Za-z][\w-]*/;
const FENCE_OPEN = /^:::[ \t]*[A-Za-z][\w-]*/;
const FENCE_CLOSE = /^:::[ \t]*$/;

const isSeparator = (line: Line) => line.indent === 0 && /^---[ \t]*$/.test(line.text);
const isDirective = (line: Line) => line.indent === 0 && DIRECTIVE.test(line.text);
const isFence = (line: Line) => line.indent === 0 && (FENCE_OPEN.test(line.text) || FENCE_CLOSE.test(line.text));

/** One-line element `type` with a highlighted prefix `mark` and optional rest `rest`. */
function lineElt(cx: BlockContext, line: Line, type: string, markLen: number, rest?: string) {
  const from = cx.lineStart;
  const end = from + line.text.length;
  const kids = [cx.elt(`${type}Mark`, from, from + markLen)];
  const restFrom = from + markLen + (line.text.slice(markLen).length - line.text.slice(markLen).trimStart().length);
  if (rest && restFrom < end) kids.push(cx.elt(rest, restFrom, end));
  cx.addElement(cx.elt(type, from, end, kids));
  cx.nextLine();
  return true;
}

/** Decktile's own block syntax on top of Markdown: frontmatter, `---` slides, `@` directives, `:::` fences. */
export const decktileSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "Frontmatter", block: true },
    "FrontmatterMark",
    "FrontmatterContent",
    { name: "SlideSeparator", block: true },
    "SlideSeparatorMark",
    { name: "Directive", block: true },
    "DirectiveMark",
    "DirectiveValue",
    { name: "FenceOpen", block: true },
    "FenceOpenMark",
    "FenceAttributes",
    { name: "FenceClose", block: true },
    "FenceCloseMark",
  ],
  parseBlock: [
    {
      name: "Frontmatter",
      before: "HorizontalRule",
      parse(cx, line) {
        if (cx.lineStart !== 0 || !isSeparator(line)) return false;
        const kids = [cx.elt("FrontmatterMark", 0, 3)];
        let contentFrom = -1;
        let contentTo = -1;
        while (cx.nextLine()) {
          if (isSeparator(line)) {
            if (contentFrom >= 0) kids.push(cx.elt("FrontmatterContent", contentFrom, contentTo));
            kids.push(cx.elt("FrontmatterMark", cx.lineStart, cx.lineStart + 3));
            cx.addElement(cx.elt("Frontmatter", 0, cx.lineStart + 3, kids));
            cx.nextLine();
            return true;
          }
          if (contentFrom < 0) contentFrom = cx.lineStart;
          contentTo = cx.lineStart + line.text.length;
        }
        return false; // unterminated: plain Markdown
      },
    },
    {
      name: "SlideSeparator",
      before: "HorizontalRule",
      parse: (cx, line) => isSeparator(line) && lineElt(cx, line, "SlideSeparator", 3),
    },
    {
      name: "Directive",
      parse: (cx, line) =>
        isDirective(line) && lineElt(cx, line, "Directive", (line.text.match(DIRECTIVE) as RegExpMatchArray)[0].length, "DirectiveValue"),
    },
    {
      name: "Fence",
      parse(cx, line) {
        if (line.indent !== 0) return false;
        if (FENCE_CLOSE.test(line.text)) return lineElt(cx, line, "FenceClose", 3);
        const m = line.text.match(FENCE_OPEN);
        return !!m && lineElt(cx, line, "FenceOpen", m[0].length, "FenceAttributes");
      },
      // `---`, `@x` and `:::` end a paragraph instead of making a setext heading or continuing it
      endLeaf: (_cx, line) => isSeparator(line) || isDirective(line) || isFence(line),
    },
  ],
  props: [
    styleTags({
      "FrontmatterMark SlideSeparatorMark": t.contentSeparator,
      DirectiveMark: t.keyword,
      DirectiveValue: t.string,
      "FenceOpenMark FenceCloseMark": t.keyword,
      FenceAttributes: t.attributeName,
    }),
  ],
  wrap: parseMixed((node) => (node.name === "FrontmatterContent" ? { parser: yaml().language.parser } : null)),
};

const pdgDescription = LanguageDescription.of({ name: "pdg", alias: ["predictygraph"], extensions: ["pdg"], support: pdg() });

/** Language for a code fence info string: `pdg` built in, everything else from @codemirror/language-data. */
export function codeLanguage(info: string): LanguageDescription | null {
  return LanguageDescription.matchLanguageName([pdgDescription, ...languages], info, true);
}

/** CodeMirror 6 support for decktile decks: `extensions: [decktile()]`. */
export function decktile(): LanguageSupport {
  return markdown({ base: markdownLanguage, codeLanguages: codeLanguage, extensions: [decktileSyntax] });
}

export { pdgLanguage };
