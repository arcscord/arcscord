import { createParaglideAdapter } from "@arcscord/adapter-paraglide";
import * as messages from "./paraglide/messages.js";
import { baseLocale, locales } from "./paraglide/runtime.js";

export const localization = createParaglideAdapter({
  messages,
  runtime: { baseLocale, locales },
});
