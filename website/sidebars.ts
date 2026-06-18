import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  guideSidebar: [
    "intro",
    {
      type: "category",
      label: "Core",
      items: [
        "guide/installation",
        "guide/client",
        "guide/commands",
        "guide/components",
        "guide/events",
        "guide/localization",
        "guide/logger",
      ],
    },
    {
      type: "category",
      label: "Packages",
      items: [
        "packages/arcscord",
        "packages/cli",
        "packages/middleware",
        "packages/error",
        "packages/better-error",
      ],
    },
  ],
};

export default sidebars;
