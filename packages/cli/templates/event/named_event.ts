import { createEvent } from "arcscord"

export const {{name}}Event = createEvent({
  name: "{{name}}",
  event: "{{event}}",
  run: (ctx, ...args) => {
    return ctx.ok(true);
  },
});