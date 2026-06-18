---
sidebar_position: 7
---

# Logger

Logger diagnostics can keep console output readable while sending detailed reports to another sink.

```ts
import { ArcClient } from "arcscord";

const diagnostics: string[] = [];

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: [],
  logger: {
    level: "info",
    format: "pretty",
    diagnostics: {
      enabled: true,
      format: "json",
      loggerFunc: (line) => {
        diagnostics.push(String(line));
      },
    },
  },
});
```
