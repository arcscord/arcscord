import type en from "../locales/en.json";

declare const resources: {
  readonly test: typeof en;
};

declare module "i18next" {
  interface CustomTypeOptions { // eslint-disable-line
    defaultNS: "test";
    resources: typeof resources;
    enableSelector: "optimize";
  }
}
