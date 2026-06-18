---
sidebar_position: 4
---

# Components

Arcscord provides helpers for Discord buttons, select menus, and modals.

## Button

```ts
import { buildClickableButton, createButton } from "arcscord";

export const simpleButton = createButton({
  route: "simple_button",
  build: id => buildClickableButton({
    label: "Simple Button",
    style: "secondary",
    customId: id(),
  }),
  run: ctx => ctx.reply("Clicked !"),
});
```

## Modal

```ts
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
    ),
  run: ctx => ctx.reply(`Your name is ${ctx.values.get("name")}`),
});
```
