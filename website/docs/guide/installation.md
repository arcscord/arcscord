---
sidebar_position: 1
description: Install Arcscord and discord.js with pnpm, npm, or yarn, and set up the Node.js runtime for your Discord bot project.
---

# Installation

Arcscord requires Node.js `24.11.0` or newer. The repository uses pnpm for workspace development, but projects that consume Arcscord as a library only need a compatible Node.js runtime and a package manager.

## Quick start

The fastest way to get a ready-to-run bot is the scaffolder:

```bash
pnpm create arcscord-bot
# or: npm create arcscord-bot / yarn create arcscord-bot
```

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

Optional packages can be installed as needed:

```bash
pnpm add @arcscord/middleware @arcscord/error @arcscord/better-error
```

Useful setup links:

- [Node.js downloads](https://nodejs.org/en/download)
- [pnpm installation](https://pnpm.io/installation)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [discord.js guide](https://discordjs.guide/)
