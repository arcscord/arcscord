import {
  webhookEvents,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createEvent } from "arcscord";
import { deleteRemindersForUser } from "../reminders/database";

export const applicationDeauthorized = createEvent({
  source: webhookEvents,
  event: WebhookEventType.ApplicationDeauthorized,
  run: (ctx, data) => {
    const deleted = deleteRemindersForUser(data.user.id);
    ctx.logger.info("Removed reminders after application deauthorization", {
      userId: data.user.id,
      deleted,
    });
  },
});
