@../source/AGENTS.md

Claude Code specifics:
- Start Claude Code from the repository root: this file, `.mcp.json` (angular-cli, spartan-ui) and `.claude/skills/spartan` are loaded from there.
- The repository root must contain only `input.txt`, `Student_doc.md`, `source/`, `booklets/` (plus hidden git/agent config). Never create visible files at the root.
- Frontend rules: `source/frontend/AGENTS.md` (imported by `source/frontend/CLAUDE.md`, loaded automatically when working in that folder).
