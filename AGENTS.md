# AGENTS.md

## Project overview

Arcscord is a pnpm-based TypeScript monorepo for Discord bot tooling and utility packages. The main package, `arcscord`, is a Discord.js-first framework focused on slash commands, typed handlers, events, components, localization, logging, and result-style error handling.

The repository contains these main workspaces:

* `packages/arcscord`: core Discord bot framework.
* `packages/cli`: CLI and project generation tooling.
* `packages/middleware`: reusable middleware helpers for Arcscord.
* `packages/error`: result-style error helpers.
* `packages/better_error`: richer error class utilities with debug context.
* `website`: documentation site.
* `test/test_bot`: local integration test bot.

## Runtime and package manager

Use the repository-defined toolchain:

* Node.js: `>=24.11.0`.
* Package manager: `pnpm@11.8.0`.
* Do not use npm or yarn for dependency installation. The root `preinstall` script enforces pnpm.

Prefer:

```sh
corepack enable
pnpm install --frozen-lockfile
```

If documentation elsewhere mentions an older pnpm version, prefer the root `package.json` `packageManager` field.

## Common commands

Run commands from the repository root unless a package-specific command is explicitly needed.

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm lint --fix=false
pnpm docs:build
```

Important notes:

* `pnpm lint` runs ESLint with `--fix` by default.
* Use `pnpm lint --fix=false` for validation-only checks.
* Use `pnpm clean` before release-style builds or when generated artifacts may be stale.
* Use filtered workspace commands for targeted work, for example:

```sh
pnpm --filter arcscord build
pnpm --filter @arcscord/cli typecheck
pnpm --filter @arcscord/error test
```

## Build order and package relationships

The root build script builds shared packages before the packages that depend on them:

1. Build packages except `arcscord` and `middleware`.
2. Build `arcscord`.
3. Build `@arcscord/middleware`.

Respect this order when debugging build failures. `arcscord` depends on `@arcscord/error` and `@arcscord/better-error`; `@arcscord/middleware` depends on `arcscord`; `@arcscord/cli` depends on both `arcscord` and `@arcscord/error`.

## TypeScript conventions

This repository uses strict TypeScript settings. Keep new code type-safe and avoid weakening the compiler configuration.

Follow these expectations:

* Keep `strict` compatibility.
* Avoid unused locals and unused parameters.
* Preserve explicit public API types for exported functions, classes, and package entry points.
* Prefer type aliases over interfaces because ESLint enforces consistent type definitions as `type`.
* Use `moduleResolution: "Bundler"` assumptions when editing imports.
* Use LF line endings.

Internal imports in `packages/arcscord` commonly use the `#/` alias for source-root imports. Preserve existing alias style when working inside that package.

## Formatting and linting

The project uses `@antfu/eslint-config` with TypeScript enabled.

Style expectations:

* Use double quotes.
* Use semicolons.
* Prefer the existing file’s import ordering and naming conventions.
* Do not manually reformat generated files.
* Avoid changing files ignored by ESLint unless the task explicitly targets them.

ESLint ignores generated documentation and CLI templates, including:

* `docs/*`
* `json_docs/*`
* `.vscode/settings.json`
* `packages/cli/templates/**`

## Testing

The root test command is:

```sh
pnpm test
```

Vitest workspace coverage currently includes:

* `packages/arcscord`
* `packages/better_error`
* `packages/error`

When changing behavior in these packages, add or update unit tests close to the changed code. For CLI, middleware, docs, or integration-bot changes, run the closest available package command and explain any missing automated coverage in the PR.

Use the local integration bot only when a change needs Discord runtime validation:

```sh
pnpm test:test-bot
```

Never commit real Discord bot tokens, webhook URLs, guild IDs tied to private environments, session cookies, npm tokens, or private keys.

## Public API rules

Treat files exported from package entry points as public API.

For `packages/arcscord`, the root `src/index.ts` exports the public surface, including:

* `ArcClient`
* command builders and command context types
* component builders and handlers
* event helpers
* managers
* locale utilities
* logger utilities
* error classes and result helpers

When modifying exported types, functions, classes, or enums:

* Check whether documentation updates are needed.
* Add tests for behavior changes.
* Mention breaking changes clearly.
* Preserve both ESM and CJS package export compatibility.
* Avoid changing package entry-point exports casually.

## ArcClient and framework behavior

`ArcClient` extends `discord.js` `Client` and owns the framework managers:

* `commandManager`
* `eventManager`
* `componentManager`
* `localeManager`

It also creates a Discord REST client, manages default user-facing error messages, supports internal tracing, and exposes helper methods such as:

* `loadCommands`
* `loadEvents`
* `loadComponents`
* `loadHandlers`
* `waitReady`
* `createLogger`

When changing client or manager behavior:

* Preserve Discord.js compatibility.
* Preserve result-style error handling where the existing code returns `Result`.
* Keep user-facing defaults overridable through options.
* Do not introduce token logging.
* Be careful with `loadHandlers`: command loading waits for the client to be ready.

## Error handling conventions

This repository intentionally uses result-style helpers and richer errors.

Prefer existing helpers from `@arcscord/error` and `@arcscord/better-error` instead of introducing ad hoc patterns:

* `ok`
* `error`
* `multiple`
* `forceSafe`
* `anyToError`
* `BaseError`

When adding errors:

* Include useful debug context.
* Avoid leaking secrets into messages or debug output.
* Preserve existing public error types where possible.
* Do not throw raw literals.

## CLI-specific guidance

`packages/cli` is an ESM package and exposes the `arcscord` binary from `dist/index.js`.

When editing CLI code:

* Preserve `"type": "module"` behavior.
* Keep generated templates compatible with the rest of the monorepo.
* Be cautious around Babel parser/traverse/generator usage.
* Keep the existing post-build `fix:babel` behavior unless replacing it with a tested equivalent.

## Documentation

Documentation generation uses TypeDoc and the website workspace.

Useful commands:

```sh
pnpm docs:api
pnpm docs:build
pnpm docs:start
```

Update docs when:

* Public package APIs change.
* Command/component/event usage changes.
* CLI-generated project structure changes.
* Error-handling or middleware usage changes.

Do not edit generated docs unless the task explicitly requires it. Prefer changing source comments, TypeDoc config, or docs source files.

## Pull request checklist

Before opening or updating a PR, run the checks relevant to the change:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm lint --fix=false
```

For release-sensitive package changes, also run:

```sh
pnpm clean
pnpm build
pnpm pack --pack-destination /tmp
```

from the affected package directory when appropriate.

A good PR should include:

* A concise explanation of the behavior change.
* Tests for bug fixes and behavior changes.
* Documentation updates for public API or usage changes.
* Notes about breaking changes, migration needs, or known limitations.
* A clear statement of any checks that could not be run locally.

## Commit messages

Use Conventional Commits.

Examples:

```text
feat: add command autocomplete helpers
fix: handle missing interaction locale
docs: update installation guide
test: cover component route parsing
refactor: simplify component route parsing
chore: update dependencies
```

Keep the subject concise and imperative. Mention breaking changes only when public API behavior changes.

## Security and secrets

Never include secrets in code, tests, documentation, logs, screenshots, issues, or PRs.

Sensitive values include:

* Discord bot tokens.
* Discord webhook URLs.
* npm tokens.
* private keys.
* session cookies.
* credentials from local `.env` files.

If a secret is exposed, stop using it, revoke it, rotate it, and remove it from history or logs before continuing.

## Agent workflow

When working in this repository:

1. Identify the affected package or workspace first.
2. Read the closest `package.json`, `tsconfig`, and test config before editing.
3. Make the smallest focused change that solves the task.
4. Preserve public API compatibility unless the task explicitly requests a breaking change.
5. Add or update tests for behavior changes.
6. Run targeted checks first, then root checks when the change crosses package boundaries.
7. Update documentation when public behavior changes.
8. Summarize changed files, validation commands, and any remaining risks.

Do not perform broad rewrites, dependency upgrades, formatting-only churn, or generated-file updates unless explicitly requested.
