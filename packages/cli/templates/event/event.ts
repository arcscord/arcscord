import { createEvent } from "arcscord"

export const {{name}}Event = createEvent({
  event: "{{name}}",
  run: (ctx, ...args) => {
    return ctx.ok(true);
  },
});