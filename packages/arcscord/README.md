# Arcscord

[![npm version](https://badge.fury.io/js/arcscord.svg)](https://www.npmjs.com/package/arcscord)
[![Discord Shield](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

## About

Arcscord simplifies building Discord bots with TypeScript.

Documentation: https://arcscord.github.io/arcscord/

## Install

`pnpm add arcscord`<br>
or `npm install arcscord`

## Example

- [Command](#command)
- [Button](#button)
- [Select Menu](#select-menu)
- [Modal](#modal)
- [Event](#event)
- [Localization](#localization)
- [Logger diagnostics](#logger-diagnostics)

## Command

```ts
// Command declaration
import { createCommand } from "arcscord";
import { EmbedBuilder, MessageFlags } from "discord.js";

export const avatarCommand = createCommand({
  build: {
    slash: {
      name: "avatar",
      description: "test command",
      options: {
        user: {
          type: "user",
          description: "The user",
        },
        size: {
          type: "number",
          description: "yeah",
          choices: [
            512,
            {
              name: "1024 (default)",
              value: 1024,
            },
            2048,
          ],
        } as const,
      },
    },
    user: {
      name: "avatar",
    },
  },
  run: (ctx) => {
    const user = ctx.isSlashCommand
      ? ctx.options.user || ctx.user
      : ctx.targetUser;

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Avatar de ${user.displayName}`)
          .setImage(user.displayAvatarURL({
            size: ctx.isSlashCommand ? ctx.options.size || 1024 : 1024,
          }) || user.defaultAvatarURL),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
});

// Command register
await client.waitReady();
const [err] = await client.loadCommands([avatarCommand]);

if (err) {
  client.logger.logError(err);
}
```

## Button

```ts
// declaration button
import { buildButtonActionRow, buildClickableButton, createButton } from "arcscord";

export const simpleButton = createButton({
  route: "simple_button",
  build: id => buildClickableButton({
    label: "Simple Button",
    style: "secondary",
    customId: id(),
  }),
  run: (ctx) => {
    return ctx.reply("Clicked !");
  },
});

// usage
message.reply({
  components: [buildButtonActionRow(simpleButton.build())]
});

// dynamic route params are passed to build
export const closeTicketButton = createButton({
  route: "ticket/close/{ticketId}",
  build: (id, label) => buildClickableButton({
    label,
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply(`Closing ticket ${ctx.params.ticketId}`),
});

message.reply({
  components: [buildButtonActionRow(closeTicketButton.build({ ticketId: "42" }, "Close ticket"))]
});

// register
client.loadComponents([simpleButton]);
```

## Select Menu

```ts
// declaration
import { buildRoleSelectMenu, createSelectMenu } from "arcscord";
import { ComponentType } from "discord-api-types/v10";
import { EmbedBuilder } from "discord.js";

export const roleSelectMenu = createSelectMenu({
  type: ComponentType.RoleSelect,
  route: "role_select_menu",
  build: (id, placeHolder) => buildRoleSelectMenu({
    placeholder: placeHolder,
    customId: id(),
    maxValues: 1,
    minValues: 1,
  }),
  run: (ctx) => {
    const role = ctx.values[0];

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Info about role ${role.name}`)
          .setDescription(`Position: ${role.position}\nColor: ${role.color}`)
          .setColor(role.color),
      ],
    });
  },
});

// usage
message.reply({
  components: [roleSelectMenu.build("Select a role")]
});

// register
client.loadComponents([roleSelectMenu]);
```

## Modal

```ts
// declaration
import { buildLabel, buildModal, buildTextInput, createModal } from "arcscord";

export const modal = createModal({
  route: "modal",
  build: (id, title) =>
    buildModal(
      title,
      id(),
      buildLabel({
        label: "Name",
        component: buildTextInput({
          customId: "name",
          style: "short",
          required: true,
        }),
      }),
      buildLabel({
        label: "Age",
        component: buildTextInput({
          customId: "age",
          style: "short",
          required: true,
        }),
      }),
    ),
  run: (ctx) => {
    return ctx.reply(`Your name is ${ctx.values.get("name")} and you are ${ctx.values.get("age")} old !`);
  },
});

// usage
ctx.showModal(modal.build("funny"));

// register
client.loadComponents([modal]);
```

## Event

```ts
// declaration
import { createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate", // Djs event
  name: "messageCreate", // OPTIONAL name for logs and debug if you want custom name
  run: (ctx, msg) => {
    ctx.client.logger.info(`message sent by ${msg.author.username}!`);
    return ctx.ok(true);
  },
});

// register
client.loadEvents([messageEvent]);
```

## Localization
full guide soon
```ts
import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";

export const i18nCommand = createCommand({
  build: {
    slash: {
      name: "i18n",
      nameLocalizations: t => t("test:i18n.command.name"),
      description: "default description",
      descriptionLocalizations: t => t("test:i18n.command.description"),
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t("test:i18n.command.run"), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
```

## Logger diagnostics

Keep console logs readable and send detailed error reports to a separate sink.

```ts
import { ArcClient } from "arcscord";

const diagnostics: string[] = [];

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: [],
  logger: {
    level: "info",
    format: "pretty",
    diagnostics: {
      enabled: true,
      format: "json",
      loggerFunc: (line) => {
        diagnostics.push(String(line));
      },
    },
  },
});
```

For production, replace `diagnostics.push` with a file writer, or any external log sink.

[Go up](#arcscord)
