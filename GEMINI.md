# GEMINI.md

@./AGENTS.md

## Quick Rules

- Project: DevVault
- TypeScript ESM + strict
- Keep embedding local-first; use `EMBEDDING_MOCK=true` for tests
- External network calls are allowed only for LLM generation
- Always include citations (MR number / author / URL) in generated answers
