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
    return error(new Error("Get negative number"));
  }

  return ok(num % 2 === 0);
}
```
