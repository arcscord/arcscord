---
sidebar_position: 5
---

# @arcscord/better-error

Extended error class with debug context support.

```ts
import { BaseError } from "@arcscord/better-error";

const error = new BaseError({
  message: "A error happen",
  debugs: {
    when: "now",
  },
});
```
