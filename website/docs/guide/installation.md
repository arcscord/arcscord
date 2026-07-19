---
sidebar_position: 1
description: Install Arcscord and discord.js with pnpm, npm, yarn, or bun, and set up the Node.js or Bun runtime for your Discord bot project.
---

# Installation

Arcscord runs on **Node.js `24.11.0` or newer**, or on **Bun `1.3.0` or newer**, and its published types require **TypeScript `5.4.0` or newer**. The repository itself uses pnpm + Node.js and a newer TypeScript compiler for development, but projects that consume Arcscord as a library only need a compatible runtime and package manager — Bun is officially supported as a consumer runtime.

## Quick start

The fastest way to get a ready-to-run bot is the scaffolder:

```bash
pnpm create arcscord-bot
# or: npm create arcscord-bot / yarn create arcscord-bot / bun create arcscord-bot
```

When you pick `bun` as the package manager, the generated project runs directly on Bun (native TypeScript and `.env` loading, no extra tooling).

It sets up TypeScript, the client, and a working `/ping` command with a button so you can start coding right away.

## Manual install

Install the core package in a Discord bot project:

```bash
pnpm add arcscord discord.js
```

With npm:

```bash
npm install arcscord discord.js
```

With Bun:

```bash
bun add arcscord discord.js
```

Additional Arcscord packages can be installed as needed:

```bash
pnpm add @arcscord/middleware @arcscord/error @arcscord/better-error
```

Arcscord already re-exports the Components V2 helpers, so an Arcscord bot does not need to install `@arcscord/components` separately. Install that package directly only when using the helpers in a standalone Discord.js project:

```bash
pnpm add @arcscord/components discord.js
```

Useful setup links:

- [Node.js downloads](https://nodejs.org/en/download)
- [Bun installation](https://bun.sh/docs/installation)
- [pnpm installation](https://pnpm.io/installation)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [discord.js guide](https://discordjs.guide/)
