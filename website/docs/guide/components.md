---
sidebar_position: 5
---

# Components

Discord components are interactive UI elements attached to messages — buttons, select menus, and modals. Arcscord provides typed handlers for all of them, with automatic custom ID routing and middleware support.

## How it works

Each component is created with a `route` (a string pattern used as the custom ID) and a `build` function that returns the Discord.js component builder. Arcscord compiles the route into a matcher at load time and dispatches each incoming interaction to the right handler.

```ts
import { button, createButton } from "arcscord";

export const simpleButton = createButton({
  route: "simple_button",
  build: id => button({ label: "Click me", style: "secondary", customId: id() }),
  run: ctx => ctx.reply("Clicked!"),
});
```

Load it with the client:

```ts
client.loadComponents([simpleButton]);
```

Then use `build()` anywhere you send a message:

```ts
import { actionRow } from "arcscord";

ctx.reply({ components: [actionRow(simpleButton.build())] });
```

## Component types

| Type | Creator | Description |
|---|---|---|
| Button | `createButton` | Clickable button in an action row |
| String select | `createSelectMenu` / `createTypedStringMenu` | Dropdown with string options |
| User / Role / Mentionable / Channel select | `createSelectMenu` | Dropdown for Discord entities |
| Modal | `createModal` | Pop-up form with typed fields |
| Components v2 | `v2Message` | Discord's new layout-first message format |

## Route parameters

Encode values in the custom ID using `{paramName}` segments. The params are passed as an object to `.build()` — inside `build`, `id()` always takes no arguments:

```ts
export const closeTicketButton = createButton({
  route: "ticket/close/{ticketId}",
  build: id => button({
    label: "Close",
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply(`Closing ticket ${ctx.params.ticketId}`),
});

// pass route params when sending the button
closeTicketButton.build({ ticketId: "42" });
```

## Defer reply

Use `preReply` to defer the interaction before middlewares and `run` execute:

```ts
createButton({
  route: "my_button",
  preReply: "ephemeral", // defer an ephemeral reply
  build: id => button({ ... }),
  run: ctx => ctx.editReply("Done!"),
});
```

`preReply: true` defers a public reply. `preReply: "ephemeral"` defers an ephemeral one.

## Detailed pages

- [Button](./components/button)
- [Select menus](./components/select-menu)
- [Modal](./components/modal)
- [Components v2](./components/components-v2)
