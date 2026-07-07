---
sidebar_position: 7
---

# Troubleshooting

This page collects common Arcscord setup, TypeScript, and runtime problems with their recommended fixes.

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
