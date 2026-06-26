---
sidebar_position: 2
---

# Client

`ArcClient` is the entry point for loading commands, components, events, and handlers.

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    event: {
      intentCheck: {
        missing: "warn",
        partialCoverage: "off",
        coverage: {
          guild: true,
          dm: true,
        },
        ignore: [],
      },
    },
  },
});
```

Load application features after the client is ready:

```ts
const [err] = await client.loadCommands([avatarCommand]);

if (err) {
  client.logger.logError(err);
}

client.loadComponents([simpleButton]);
await client.loadEvents([messageEvent]);
```
