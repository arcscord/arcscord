import type resources from "./recources";

declare module "i18next" {
  interface CustomTypeOptions { // eslint-disable-line
    defaultNS: "test";
    resources: typeof resources;
  }
}
