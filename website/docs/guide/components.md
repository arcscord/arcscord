---
sidebar_position: 4
---

# Components

Arcscord provides helpers for Discord buttons, select menus, and modals.

## Button

```ts
import { button, createButton } from "arcscord";

export const simpleButton = createButton({
  route: "simple_button",
  preReply: "ephemeral",
  build: id => button({
    label: "Simple Button",
    style: "secondary",
    customId: id(),
  }),
  run: ctx => ctx.editReply("Clicked !"),
});
```

`preReply: true` defers a public response before component middlewares and the handler run. `preReply: "ephemeral"` defers an ephemeral response.

## Route parameters

Use dynamic route segments with `{name}` when a component needs values encoded
in its custom ID. Pass those values as the first argument to `build`.

```ts
import { button, createButton } from "arcscord";

export const closeTicketButton = createButton({
  route: "ticket/close/{ticketId}",
  build: (id, label) => button({
    label,
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply(`Closing ticket ${ctx.params.ticketId}`),
});

closeTicketButton.build({ ticketId: "42" }, "Close ticket");
```

If the route has no dynamic segment, keep passing the typed build arguments
directly.

```ts
simpleButton.build();
roleSelectMenu.build("Select a role");
```

## Modal

```ts
import { label, modal, textInput, createModal } from "arcscord";

export const modal = createModal({
  route: "modal",
  build: (id, title) =>
    modal(
      title,
      id(),
      label({
        label: "Name",
        component: textInput({
          customId: "name",
          style: "short",
          required: true,
        }),
      }),
    ),
  run: ctx => ctx.reply(`Your name is ${ctx.values.get("name")}`),
});
```
