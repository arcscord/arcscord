---
sidebar_position: 3
---

# Commands

Commands are declared with `createCommand`. A command can expose slash command metadata and a typed `run` handler.

```ts
import { createCommand } from "arcscord";
import { EmbedBuilder } from "discord.js";

export const avatarCommand = createCommand({
  build: {
    slash: {
      name: "avatar",
      description: "Show a user avatar",
      options: {
        user: {
          type: "user",
          description: "The user",
        },
      },
    },
  },
  run: (ctx) => {
    const user = ctx.options.user || ctx.user;

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Avatar de ${user.displayName}`)
          .setImage(user.displayAvatarURL()),
      ],
      ephemeral: true,
    });
  },
});
```
