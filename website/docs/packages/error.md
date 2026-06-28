---
sidebar_position: 4
---

# @arcscord/error

Result-style helpers inspired by Go error handling.

```ts
import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";

function foo(num: number): Result<boolean, Error> {
  if (num <= 0) {
    return error(new Error("Expected a positive number"));
  }

  return ok(num % 2 === 0);
}
```

Links:

- [Documentation](https://arcscord.dev/packages/error)
- [API reference](/api?package=error)
- [npm package](https://www.npmjs.com/package/@arcscord/error)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/error)
