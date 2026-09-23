import { createI18nextAdapter } from "@arcscord/adapter-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export const localization = createI18nextAdapter({
  options: {
    resources: {
      en: { test: en },
      fr: { test: fr },
    },
    defaultNS: "test",
    fallbackLng: "en",
    enableSelector: "optimize",
  },
});
