import type resources from "./resources";

declare module "i18next" {
  interface CustomTypeOptions { // eslint-disable-line
    defaultNS: "translations";
    resources: typeof resources;
  }
}
