---
sidebar_position: 5
---

# @arcscord/better-error

Extended error class with debug context support.

```ts
import { BaseError } from "@arcscord/better-error";

const error = new BaseError({
  message: "An error happened",
  debugs: {
    when: "now",
  },
});
```

Links:

- [Documentation](https://arcscord.github.io/arcscord/)
- [API reference](/api?package=better-error)
- [npm package](https://www.npmjs.com/package/@arcscord/better-error)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/better_error)
