import type en from "../../locale/en.json";

declare const resources: {
  readonly translations: typeof en;
};

declare module "i18next" {
  interface CustomTypeOptions { // eslint-disable-line
    defaultNS: "translations";
    resources: typeof resources;
    enableSelector: "optimize";
  }
}
