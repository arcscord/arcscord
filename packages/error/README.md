# @arcscord/error

An error handling package inspired by Go error handling.

Documentation: https://arcscord.github.io/arcscord/

## Example

```ts
import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";

function foo(num: number): Result<boolean, Error> {
  if (num <= 0) {
    return error(new Error("Expected a positive number"));
  }
  return ok(num % 2 === 0);
}

const [err, isFoo] = foo(3);
if (err) {
  console.error(err);
}
else {
  console.log(isFoo);
}
```

Made by Arcoz with ❤️
