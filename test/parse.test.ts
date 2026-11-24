// SPDX-FileCopyrightText: 2026 Reza Jelveh
//
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { parser as mdParser } from "@lezer/markdown";
import { codeLanguage, decktileSyntax } from "../src/index.ts";

const parser = mdParser.configure([decktileSyntax]);

/** Top-level node names (no Document) and their text. */
function top(src: string) {
  const out: [string, string][] = [];
  const c = parser.parse(src).cursor();
  if (c.firstChild())
    do out.push([c.name, src.slice(c.from, c.to)]);
    while (c.nextSibling());
  return out;
}
const names = (src: string) => top(src).map(([n]) => n);

test("frontmatter, slides, directives", () => {
  const src = "---\ntitle: x\ntheme: y\n---\n\n# Hi\n@kicker Hello there\nText\n---\n## Next\n";
  const got = top(src);
  assert.deepEqual(
    got.map(([n]) => n),
    ["Frontmatter", "ATXHeading1", "Directive", "Paragraph", "SlideSeparator", "ATXHeading2"],
  );
  assert.equal(got[0]?.[1], "---\ntitle: x\ntheme: y\n---");
  assert.equal(got[2]?.[1], "@kicker Hello there");
});

test("`---` after a paragraph is a slide break, not a setext heading", () => {
  assert.deepEqual(names("Text\n---\nMore\n"), ["Paragraph", "SlideSeparator", "Paragraph"]);
});

test("fences with attributes", () => {
  assert.deepEqual(names("::: grid {cols=2}\n::: card {tag=red}\n### A\n:::\n:::\n"), [
    "FenceOpen",
    "FenceOpen",
    "ATXHeading3",
    "FenceClose",
    "FenceClose",
  ]);
});

test("frontmatter is YAML", () => {
  const src = "---\ntitle: x\n---\n";
  const tree = parser.parse(src);
  assert.notEqual(tree.resolveInner(src.indexOf("title") + 1, 1).name, "FrontmatterContent");
});

test("code fences: pdg built in, others from language-data", () => {
  assert.equal(codeLanguage("pdg")?.name, "pdg");
  assert.equal(codeLanguage("python")?.name, "Python");
});

const decks = process.env.DECKS;
test("every deck parses", { skip: !decks && "set DECKS=<dir with *.deck.md>" }, () => {
  const files = readdirSync(decks as string)
    .filter((f) => f.endsWith(".deck.md"))
    .map((f) => join(decks as string, f));
  assert.ok(files.length > 0);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const n = names(src);
    const seps = src.split("\n").filter((l) => /^---[ \t]*$/.test(l)).length;
    const fm = n[0] === "Frontmatter" ? 2 : 0;
    // every `---` outside code blocks is frontmatter or a slide break
    const inCode = (() => {
      let k = 0;
      parser.parse(src).iterate({
        enter: (x) => {
          if (x.name === "FencedCode") {
            k += src
              .slice(x.from, x.to)
              .split("\n")
              .filter((l) => /^---[ \t]*$/.test(l)).length;
            return false;
          }
        },
      });
      return k;
    })();
    assert.equal(n.filter((x) => x === "SlideSeparator").length, seps - fm - inCode, f);
  }
});
