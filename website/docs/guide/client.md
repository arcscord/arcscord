---
sidebar_position: 2
---

# Client

`ArcClient` is the entry point for loading commands, components, events, and handlers.

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: [],
});
```

Load application features after the client is ready:

```ts
await client.loadCommands([avatarCommand]);
client.loadComponents([simpleButton]);
client.loadEvents([messageEvent]);
```
