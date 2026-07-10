# Contributing to Arcscord

Thank you for taking the time to improve Arcscord. This project is a pnpm-based TypeScript monorepo for Discord bot tooling and utility packages.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- Use Discord for support questions and troubleshooting. GitHub issues should be for reproducible bugs, accepted feature work, and documentation improvements.
- Do not open a public issue for a security vulnerability. Follow [SECURITY.md](SECURITY.md) instead.

## Development Setup

Requirements:

- Node.js 24 or newer
- pnpm 10.33.2 or newer

Install dependencies:

```sh
pnpm install
```

Useful commands:

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm lint --fix=false
pnpm docs:build
```

The default `pnpm lint` script applies fixes. Use `pnpm lint --fix=false` when you only want to check formatting and lint rules.

## Repository Layout

- `packages/arcscord`: core Discord bot framework
- `packages/create-arcscord-bot`: maintained project scaffolder
- `packages/middleware`: reusable middleware
- `packages/error`: result-style error helpers
- `packages/better_error`: richer error class utilities
- `website`: documentation site
- `test/test_bot`: local integration test bot

The former unpublished `@arcscord/cli` prototype was removed from the active workspace. Its history remains available in Git; use `create-arcscord-bot` for project scaffolding.

## Pull Requests

Keep pull requests focused. A good pull request usually includes:

- A short explanation of the behavior change
- Tests for bug fixes and behavior changes
- Documentation updates when public APIs or usage patterns change
- Notes about breaking changes, migration work, or known limitations

Before requesting review, run the checks that match your change:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm lint --fix=false
```

If one of these commands cannot be run locally, mention that in the pull request.

## Commit Messages

Conventional commits are recommended because the repository already uses commitlint. They are not meant to block useful contributions, but they make history easier to scan.

Common examples:

- `feat: add command autocomplete helpers`
- `fix: handle missing interaction locale`
- `docs: update installation guide`
- `test: cover component route parsing`
- `chore: update dependencies`

If you generate commit messages with AI, use a prompt like this:

```text
Write a concise Conventional Commit message for this diff.
Use one of: feat, fix, docs, test, refactor, chore, ci, build.
Use imperative mood.
Keep the subject under 72 characters.
Mention breaking changes only if the diff changes public API behavior.
```

## Bug Reports

Use the bug report issue form and include:

- Arcscord package and version
- Runtime and package manager versions
- A minimal reproduction or code sample
- Expected and actual behavior
- Relevant logs or stack traces with tokens and secrets removed

## Feature Requests

Use the feature request issue form. Explain the workflow you want to improve, not only the API shape you prefer.

## Security

Never include Discord bot tokens, npm tokens, private keys, session cookies, or webhook URLs in issues, pull requests, logs, screenshots, or examples. If you accidentally expose a secret, revoke and rotate it immediately before continuing.

Report vulnerabilities privately through the process in [SECURITY.md](SECURITY.md).
