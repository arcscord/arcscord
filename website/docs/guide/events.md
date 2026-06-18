---
sidebar_position: 5
---

# Events

Events are declared with `createEvent` and map to Discord.js event names.

```ts
import { createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate",
  name: "messageCreate",
  run: (ctx, msg) => {
    ctx.client.logger.info(`message sent by ${msg.author.username}`);
    return ctx.ok(true);
  },
});
```
