---
sidebar_position: 1
---

# Button

## Styles

Discord has four interactive button styles. The `button()` helper only creates clickable buttons — link and premium buttons are not dispatched as interactions and must be built directly with discord.js.

<div className="discord-preview">
  <button className="discord-btn discord-btn--primary">Primary</button>
  <button className="discord-btn discord-btn--secondary">Secondary</button>
  <button className="discord-btn discord-btn--success">Success</button>
  <button className="discord-btn discord-btn--danger">Danger</button>
</div>

<div className="discord-preview">
  <button className="discord-btn discord-btn--primary">With emoji 🎉</button>
  <button className="discord-btn discord-btn--secondary discord-btn--disabled">Disabled</button>
</div>

| Style | Alias | Color |
|---|---|---|
| `"primary"` | `"blurple"` | Indigo `#5865F2` |
| `"secondary"` | `"grey"` | Grey `#4E5058` |
| `"success"` | `"green"` | Green `#248046` |
| `"danger"` | `"red"` | Red `#DA373C` |

## `button()` options

`button()` builds the Discord component. Pass its return value to `id()` inside a `createButton` handler.

| Option | Type | Required | Description |
|---|---|---|---|
| `style` | `"primary"` \| `"secondary"` \| `"success"` \| `"danger"` | Yes | Visual style of the button. |
| `customId` | `string` | Yes | Must be set to `id()` (see `createButton`). Max 100 chars. |
| `label` | `string` | Yes* | Text shown on the button. Max 80 chars. *Required if no `emoji`. |
| `emoji` | `ComponentEmojiResolvable` | Yes* | Emoji shown on the button. *Required if no `label`. |
| `disabled` | `boolean` | No | Greys out the button so it cannot be clicked. Default: `false`. |
| `id` | `number` | No | Internal component ID for components v2 routing. Rarely needed. |

## `createButton()` options

`createButton()` defines the Arcscord handler — the route, builder, and interaction handler.

| Option | Type | Required | Description |
|---|---|---|---|
| `route` | `string` | Yes | Custom ID pattern. Allowed chars: `a-z A-Z 0-9 _ -`. Use `{name}` for dynamic segments. Max 100 chars. |
| `build` | `(id, ...args) => Button` | Yes | Receives `id` — always call as `id()` with no arguments. Route params are passed to `.build({ paramName })` by the sender, not to `id()`. |
| `run` | `(ctx) => Result` | Yes | Interaction handler. `ctx` is a `ButtonContext`. |
| `preReply` | `true` \| `"ephemeral"` | No | Defers the reply before middlewares run. `true` = public defer, `"ephemeral"` = ephemeral defer. |
| `use` | `ComponentMiddleware[]` | No | Middleware chain applied before `run`. |

## Basic example

```ts
import { button, createButton } from "arcscord";

export const confirmButton = createButton({
  route: "confirm",
  build: id => button({
    label: "Confirm",
    style: "success",
    customId: id(),
  }),
  run: ctx => ctx.reply("Confirmed!"),
});
```

## With emoji

```ts
export const alertButton = createButton({
  route: "alert",
  build: id => button({
    emoji: "⚠️",
    label: "Alert",
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply("Alert triggered."),
});
```

## Defer (slow operations)

```ts
export const generateButton = createButton({
  route: "generate",
  preReply: true,           // public deferred reply
  build: id => button({ label: "Generate", style: "primary", customId: id() }),
  run: async (ctx) => {
    const result = await slowOperation();
    return ctx.editReply(result);
  },
});
```

Use `preReply: "ephemeral"` to defer an ephemeral reply (only the user who clicked sees it).

## Route parameters

Encode values into the custom ID using `{paramName}` segments. The params object is passed by the sender to `.build()` — inside the `build` function, `id()` always takes no arguments. Retrieve params in `run` from `ctx.params`.

```ts
export const closeTicketButton = createButton({
  route: "ticket/{ticketId}/close",
  build: id => button({
    label: "Close ticket",
    style: "danger",
    customId: id(),
  }),
  run: ctx => ctx.reply(`Closing ticket #${ctx.params.ticketId}`),
});

// sending the button: pass route params as object to .build()
ctx.reply({
  content: "Manage ticket",
  components: [actionRow(closeTicketButton.build({ ticketId: "42" }))],
});
```

Multiple segments are supported: `route: "ticket/{ticketId}/user/{userId}"` → `build({ ticketId: "1", userId: "2" })`.

## Multiple buttons in a row

An action row holds up to 5 buttons.

```ts
import { actionRow } from "arcscord";

ctx.reply({
  components: [
    actionRow(
      confirmButton.build(),
      cancelButton.build(),
      deleteButton.build("42"),
    ),
  ],
});
```

## Disabled state

```ts
button({ label: "Unavailable", style: "secondary", customId: id(), disabled: true })
```

To disable a button after a click, use `ctx.disableComponents()` or `ctx.disableRows()` on the button context.
