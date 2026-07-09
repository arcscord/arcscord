// English is the default language, so `en.json` drives the translation types
// (`fr.json` must keep the same key set).
import type en from "../../locales/en.json";

declare const resources: {
  readonly translations: typeof en;
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translations";
    resources: typeof resources;
    enableSelector: "optimize";
  }
}
