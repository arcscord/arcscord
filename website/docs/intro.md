---
sidebar_position: 1
description: Find the right starting point in the Arcscord guide — installation, migrating from discord.js, or the API reference.
keywords:
  - arcscord
  - discord bot
  - discord.js framework
  - typescript discord
---

# Arcscord

Welcome to the Arcscord guide. Pick where to start:

- **New to Discord bots?** Start with [Installation](/guide/installation).
- **Already have a discord.js bot?** See [Migrate from discord.js](/guide/migration/from-discordjs).
- **Looking for generated signatures?** Use the [API reference](/api).
- **Want to see full bots?** Browse the [example bots](https://github.com/arcscord/arcscord/tree/main/examples) you can clone and run.

## Packages

- [`arcscord`](/packages/arcscord): core Discord bot framework.
- [`@arcscord/components`](/packages/components): Discord Components V2 helpers, available through `arcscord` or as a standalone Discord.js package.
- `create-arcscord-bot`: ready-to-run project scaffolder, documented in [Installation](/guide/installation).
- [`@arcscord/middleware`](/packages/middleware): reusable middleware for commands and components.
- [`@arcscord/error`](/packages/error): result-style error handling helpers.
- [`@arcscord/better-error`](/packages/better-error): richer `Error` class with debug context.

## Examples

Full bots you can clone and run, in the [`examples/`](https://github.com/arcscord/arcscord/tree/main/examples) folder:

- [`starter-bot`](https://github.com/arcscord/arcscord/tree/main/examples/starter-bot): the smallest end-to-end bot — typed commands, a self-updating button, a middleware, and an event.
- [`reminder-bot`](https://github.com/arcscord/arcscord/tree/main/examples/reminder-bot): personal reminders in SQLite with a background scheduler and subcommands.
- [`ticket_bot`](https://github.com/arcscord/arcscord/tree/main/examples/ticket_bot): a full ticket system with Prisma, i18n, modals, and a custom result handler.

:::note Examples track the latest version
The examples on the `main` branch always pin the **latest published** Arcscord
version. To follow an example that matches a **specific** framework version,
check out the branch for that version (e.g. `git switch <version-branch>`)
before installing — its examples pin the matching `arcscord` release.
:::
