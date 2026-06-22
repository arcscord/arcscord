---
sidebar_position: 8
---

# Localization

Arcscord exposes translation helpers in command metadata and runtime contexts.

```ts
import { createCommand } from "arcscord";

export const i18nCommand = createCommand({
  build: {
    slash: {
      name: "i18n",
      nameLocalizations: t => t("test:i18n.command.name"),
      description: "default description",
      descriptionLocalizations: t => t("test:i18n.command.description"),
    },
  },
  run: ctx => ctx.reply(ctx.t("test:i18n.command.run"), {
    ephemeral: true,
  }),
});
```
