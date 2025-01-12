import { createEvent } from "arcscord"

export const {{name}}Event = createEvent({
  event: "{{name}}",
  name: "{{name}}",
  run: (ctx, ..._args) => {
    return ctx.ok(true);
  },
});