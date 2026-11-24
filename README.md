# @decktile/lezer-decktile

[CodeMirror 6](https://codemirror.net/) language support for [decktile](https://github.com/decktile/decktile)
Markdown slide decks (`*.deck.md`), built as a [@lezer/markdown](https://github.com/lezer-parser/markdown) extension.

- YAML frontmatter, highlighted as YAML.
- `---` slide breaks (never read as setext headings).
- `@kicker`, `@layout`, `@transition` and other `@` directives.
- `::: grid {cols=2}` / `::: card` fences and their attributes.
- Code blocks in their own language; ```` ```pdg ```` uses
  [@predictygraph/lezer-pdg](https://github.com/predictygraph/lezer-pdg), the rest comes from `@codemirror/language-data`.

Mirrors [tree-sitter-decktile](https://github.com/decktile/tree-sitter-decktile).

## Use

```sh
npm install @decktile/lezer-decktile
```

```js
import { EditorView, basicSetup } from "codemirror";
import { decktile } from "@decktile/lezer-decktile";

new EditorView({ doc: "---\ntitle: Demo\n---\n\n# Hello\n@kicker KubeCon\n", extensions: [basicSetup, decktile()], parent: document.body });
```

Also exported: `decktileSyntax` (the `MarkdownConfig`, for your own `markdown({ extensions })` setup) and
`codeLanguage(info)` (the code block language lookup).

## Develop

```sh
npm ci
make check test
DECKS=../talks npm test   # also parse every *.deck.md there
```

Release: `make release V=patch|minor|major` tags and pushes; the `release` workflow publishes to npm.

## License

Apache-2.0
