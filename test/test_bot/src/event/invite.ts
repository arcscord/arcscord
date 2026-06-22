import { createEvent } from "arcscord";

export const inviteEvent = createEvent({
  event: "inviteCreate",
  run: (ctx, _invite) => {
    return ctx.ok(true);
  },
});
