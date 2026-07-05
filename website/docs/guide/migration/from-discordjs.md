---
sidebar_position: 1
description: Port an existing discord.js bot to Arcscord — side-by-side comparisons for client setup, commands, buttons, events, and error handling.
---

# Migrate from discord.js

Arcscord does not replace discord.js — `ArcClient` extends discord.js's
[`Client`](https://discord.js.org/docs/packages/discord.js/main/Client:Class).
Every option, property, event, and REST method you already use still works. This
page shows the Arcscord equivalent of common raw discord.js patterns, so you can
port a bot incrementally, one command or listener at a time.

## Client setup

```ts title="Before"
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

await client.login(process.env.DISCORD_TOKEN);
```

```ts title="After"
import { ArcClient, createEvent } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
});

await client.loadEvents([
  createEvent({
    event: "clientReady",
    options: { once: true },
    run: (ctx) => {
      ctx.client.logger.info(`Logged in as ${ctx.client.user?.tag}`);
      return ctx.ok(true);
    },
  }),
]);

await client.login();
```

See [Client](/guide/client) for the full option list — `partials`, `rest`,
`presence`, and every other discord.js `ClientOptions` field is still accepted.

## Slash commands

```ts title="Before"
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check if the bot is available");

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID!), {
  body: [pingCommand.toJSON()],
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }
});
```

```ts title="After"
import { createCommand } from "arcscord";

export const pingCommand = createCommand({
  slash: {
    name: "ping",
    description: "Check if the bot is available",
  },
  run: ctx => ctx.reply("Pong!"),
});

await client.loadCommands([pingCommand]);
```

`createCommand` replaces both the builder and the manual `interactionCreate`
dispatch: registration and routing to the right handler are handled by
`loadCommands`/`CommandManager`. See [Commands](/guide/commands).

## Buttons

```ts title="Before"
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, ticketId] = interaction.customId.split(":");
  if (action === "close-ticket") {
    await interaction.reply(`Closing ticket #${ticketId}`);
  }
});
```

```ts title="After"
import { button, createButton } from "arcscord";

export const closeTicketButton = createButton({
  route: "ticket/{ticketId}/close",
  build: id => button({
    label: "Close ticket",
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply(`Closing ticket #${ctx.params.ticketId}`),
});
```

The route replaces manual `customId` parsing: params are typed and extracted
into `ctx.params` for you. See [Buttons](/guide/components/button).

## Events

```ts title="Before"
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  console.log(`${message.author.username}: ${message.content}`);
});
```

```ts title="After"
import { createEvent } from "arcscord";

export const messageCreateEvent = createEvent({
  event: "messageCreate",
  name: "messagePrefixLogger",
  run: (ctx, message) => {
    if (message.author.bot) {
      return ctx.ok(true);
    }

    ctx.client.logger.debug(`message from ${message.author.username}: ${message.content}`);
    return ctx.ok(true);
  },
});

await client.loadEvents([messageCreateEvent]);
```

`createEvent` types the callback arguments from the event name and plugs into
the same result/error handling as commands and components. See
[Events](/guide/events).

## Error handling

```ts title="Before"
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await runCommand(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "Something went wrong.", ephemeral: true });
  }
});
```

```ts title="After"
import { error, ok } from "@arcscord/error";
import { createCommand } from "arcscord";

export const riskyCommand = createCommand({
  slash: {
    name: "risky",
    description: "Might fail",
  },
  run: async (ctx) => {
    const result = await doSomethingRisky();
    if (!result.success) {
      return error(new Error("Something went wrong"));
    }

    return ok("Done!");
  },
});
```

No `try`/`catch` or manual reply needed: handlers return a `Result`, and
Arcscord's default `resultHandler` logs the error and replies to the user for
you. Both are fully overridable — see [Error handling](/guide/error-handling)
and [Result handler](/guide/result-handler).
