import { createEvent } from "arcscord";

export const {{name}}Event = createEvent({
  event: "{{name}}",
  name: "{{name}}",
  options: {
    beforeReady: "run",
  },
  run: (ctx, ..._args) => {
    return ctx.ok(true);
  },
});
