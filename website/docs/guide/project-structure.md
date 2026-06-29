---
sidebar_position: 3
description: A recommended folder layout for an Arcscord Discord bot — where to put commands, components, events, middlewares, services, and the handlers registry.
---

# Project structure

Arcscord does not impose a project structure, and it **never loads files by scanning
folders**. Every command, component and event is imported explicitly into a single
registry file (`handlers.ts`) and passed to [`client.loadHandlers`](./client.md). The
layout below is therefore a *convention* to keep your code organized — not a runtime
requirement. Rename or reshape it freely, as long as everything ends up in your registry.

:::note
There is no auto-loader. A file placed under `commands/` does nothing until you import its
export and add it to `handlers.ts`. This keeps loading explicit, type-safe and
tree-shakeable.
:::

## Recommended layout

```text
discordbot/
├── src/
│   ├── types/
│   │   └── i18next.d.ts
│   ├── commands/
│   │   ├── open.ts
│   │   ├── close.ts
│   │   └── moderation/
│   │       ├── def.ts
│   │       ├── kick.ts
│   │       ├── ban.ts
│   │       └── mute.ts
│   ├── components/
│   │   ├── confirm_ticket.ts
│   │   ├── cancel_ticket.ts
│   │   └── open_form.ts
│   ├── events/
│   │   ├── message_create.ts
│   │   └── client_ready.ts
│   ├── middleware/
│   │   └── has_ticket_perm_middleware.ts
│   ├── services/
│   │   ├── ticket_service.ts
│   │   └── moderation_service.ts
│   ├── handlers.ts
│   └── index.ts
├── locales/
│   ├── en.json
│   └── fr.json
├── package.json
└── tsconfig.json
```

## What goes where

| Folder / file | Contents |
|---|---|
| `types/i18next.d.ts` | i18next type augmentation so `ctx.t(...)` is fully typed. See [Localization](./localization.md). |
| `commands/` | One file per command (`createCommand`). Group related subcommands in a subfolder with a `def.ts`. See [Slash commands](./commands/slash.md) and [Subcommands](./commands/subcommands.md). |
| `components/` | Buttons, select menus and modals, each identified by a `route`. See [Button](./components/button.md). |
| `events/` | Gateway event listeners created with `createEvent`. See [Events](./events.md). |
| `middleware/` | `CommandMiddleware` / `ComponentMiddleware` classes, attached to a handler via `use: [...]`. See [Middleware](./middleware.md). |
| `services/` | Your business logic, kept out of the handlers (see below). |
| `locales/` | i18n resource files (`en.json`, `fr.json`, …). See [Localization](./localization.md). |
| `handlers.ts` | The registry — imports every handler and groups them. |
| `index.ts` | Client setup and `loadHandlers` call. |

### Keep business logic in `services/`

A handler's `run()` should stay thin: read the interaction, call a service, reply. Put the
actual work (database access, ticket creation, moderation rules…) in `services/` so it can
be reused across commands, components and events, and tested in isolation. This folder is a
design recommendation — Arcscord neither requires nor knows about it.

### Subcommand groups with `def.ts`

When a command has subcommands (e.g. a `moderation` command with `kick` / `ban` / `mute`),
put each subcommand in its own file and assemble them in a `def.ts` using
`buildCommandWithSubs`:

```ts title="commands/moderation/def.ts"
import { buildCommandWithSubs } from "arcscord";
import { banSubCommand } from "./ban";
import { kickSubCommand } from "./kick";
import { muteSubCommand } from "./mute";

export const moderationCommand = buildCommandWithSubs({
  name: "moderation",
  description: "Moderation tools",
  subCommands: [kickSubCommand, banSubCommand, muteSubCommand],
});
```

Only the `def.ts` export is added to `handlers.ts`. See [Subcommands](./commands/subcommands.md).

## The `handlers.ts` registry

`handlers.ts` collects every handler into a single object typed with `HandlersList`:

```ts title="handlers.ts"
import type { HandlersList } from "arcscord";
import { closeCommand } from "./commands/close";
import { openCommand } from "./commands/open";
import { moderationCommand } from "./commands/moderation/def";
import { cancelTicket } from "./components/cancel_ticket";
import { confirmTicket } from "./components/confirm_ticket";
import { openForm } from "./components/open_form";
import { clientReadyEvent } from "./events/client_ready";
import { messageCreateEvent } from "./events/message_create";

export default {
  events: [clientReadyEvent, messageCreateEvent],
  components: [confirmTicket, cancelTicket, openForm],
  commands: [openCommand, closeCommand, moderationCommand],
} satisfies HandlersList;
```

Then load it once in `index.ts`:

```ts title="index.ts"
import { ArcClient } from "arcscord";
import handlers from "./handlers";

const client = new ArcClient(process.env.TOKEN!, {
  intents: ["Guilds"],
});

await client.loadHandlers(handlers);
```

## Scaling up

As your bot grows, split each handler folder into **category or feature subfolders**. The
`moderation/` folder above is one example; you can do the same for components
(`components/tickets/…`), events, and so on:

```text
src/
├── commands/
│   ├── moderation/
│   │   ├── def.ts
│   │   ├── kick.ts
│   │   ├── ban.ts
│   │   └── mute.ts
│   └── tickets/
│       ├── open.ts
│       └── close.ts
└── components/
    └── tickets/
        ├── confirm_ticket.ts
        └── cancel_ticket.ts
```

This changes nothing at runtime — handlers are still imported into `handlers.ts`. Organize the
folders however you like; only the imports in `handlers.ts` matter.

## Alternative: organize by feature

The layout above groups files **by type** (all commands together, all components together,
…). This is the most common convention and stays clear for small to medium bots. For larger
projects you may prefer to group **by feature** instead, co-locating everything that belongs
to one domain:

```text
src/
├── features/
│   ├── tickets/
│   │   ├── open.command.ts
│   │   ├── close.command.ts
│   │   ├── confirm_ticket.button.ts
│   │   ├── cancel_ticket.button.ts
│   │   └── ticket.service.ts
│   └── moderation/
│       ├── def.ts
│       ├── kick.ts
│       ├── ban.ts
│       ├── mute.ts
│       └── moderation.service.ts
├── handlers.ts
└── index.ts
```

The trade-off is the usual one:

- **By type** (the recommended layout) — easy to learn, matches most bot templates, but a
  single feature is spread across `commands/`, `components/`, `services/`, …
- **By feature** — everything about a feature lives in one folder, which scales better and
  makes a feature easy to add or remove, at the cost of a little more ceremony for a small bot.

Both work identically with Arcscord: whatever the folders, each handler still ends up imported
into `handlers.ts`. Pick one and stay consistent.
