---
sidebar_position: 7
---

# Troubleshooting

This page collects common Arcscord setup, TypeScript, and runtime problems with their recommended fixes.

## Localization

### Discord mentions are rendered as `&lt;@...&gt;`

i18next escapes interpolated values by default. This is useful when translations are rendered as HTML, but a Discord mention passed as an interpolation value is changed from `<@457144873859022858>` to `&lt;@457144873859022858&gt;`. Discord then displays it as plain text instead of recognizing it as a mention.

Prefer interpolating only the trusted Discord ID and keeping the mention syntax in the translation:

```json title="locales/en.json"
{
  "welcome": "Welcome, <@{{userId}}>"
}
```

```ts
const userId = ctx.interaction.user.id;

return ctx.reply({
  content: ctx.t($ => $.welcome, { userId }),
  allowedMentions: { users: [userId] },
});
```

Because a Discord snowflake contains only digits, i18next has no special characters to escape. Restricting `allowedMentions` also prevents the message from notifying users other than the intended one.

If the entire mention must be interpolated, mark only that variable as unescaped with i18next's `{{- variable}}` syntax:

```json title="locales/en.json"
{
  "welcome": "Welcome, {{- mention}}"
}
```

```ts
const userId = ctx.interaction.user.id;

return ctx.reply({
  content: ctx.t($ => $.welcome, { mention: `<@${userId}>` }),
  allowedMentions: { users: [userId] },
});
```

You can also disable escaping for one translation call:

```ts
ctx.t($ => $.welcome, {
  mention: `<@${ctx.interaction.user.id}>`,
  interpolation: { escapeValue: false },
});
```

This disables escaping for every interpolated value in that call, not only the mention. Only use it when all values are trusted or validated.

As a broader option, set `interpolation.escapeValue` to `false` in the locale manager's `i18nOptions`. This applies to every translation handled by that i18next instance, so it is only appropriate when the translations are used exclusively for Discord output and every untrusted value is validated or escaped separately:

```ts
i18nOptions: {
  // ...
  interpolation: {
    escapeValue: false,
  },
},
```

See i18next's [unescape documentation](https://www.i18next.com/translation-function/interpolation#unescape) for the exact interpolation behavior. Do not disable escaping merely to pass through arbitrary user-provided text, and use Discord's `allowedMentions` option whenever a translated message can contain mentions.

## TypeScript

### TS7022 or TS7023 when a component rebuilds itself

You may see errors like these when a component handler references itself inside its own initializer:

```text
'pingButton' implicitly has type 'any' because it does not have a type annotation
and is referenced directly or indirectly in its own initializer.

'run' implicitly has return type 'any' because it does not have a return type
annotation and is referenced directly or indirectly in one of its return expressions.
```

This often happens when a button updates the message and rebuilds the same button in its `run` callback:

```ts
import { accessory, button, container, createButton, section, v2Message } from "arcscord";

export const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  run: ctx => ctx.updateMessage(v2Message(
    container(
      { accentColor: 0x5865F2 },
      section(
        "## Pong!",
        `Latency: ${ctx.client.ws.ping}ms`,
        accessory(pingButton.build()),
      ),
    ),
  )),
});
```

TypeScript has to infer `pingButton`, then infer `run`, then follow `pingButton.build()` inside `run`, which loops back to the value currently being inferred.

Prefer specifying the `run` return type explicitly:

```ts
import type { ComponentRunReturn, MaybePromise } from "arcscord";
import { accessory, button, container, createButton, section, v2Message } from "arcscord";

export const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  run: (ctx): MaybePromise<ComponentRunReturn> => ctx.updateMessage(v2Message(
    container(
      { accentColor: 0x5865F2 },
      section(
        "## Pong!",
        `Latency: ${ctx.client.ws.ping}ms`,
        accessory(pingButton.build()),
      ),
    ),
  )),
});
```

`MaybePromise<ComponentRunReturn>` matches what component handlers accept and still lets helpers such as `ctx.updateMessage()` return a promise.

You can also avoid the cycle by extracting the message builder into a typed helper, but annotating the `run` return type is usually the smallest fix.
