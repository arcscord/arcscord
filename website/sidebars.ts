import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  guideSidebar: [
    "intro",
    {
      type: "category",
      label: "Setup",
      items: [
        "guide/installation",
        "guide/client",
        "guide/commands",
        "guide/events",
        "guide/localization",
        "guide/logger",
      ],
    },
    {
      type: "category",
      label: "Commands",
      items: [
        "guide/commands/slash",
        "guide/commands/options",
        "guide/commands/context-menu",
        "guide/commands/subcommands",
        "guide/commands/permissions-contexts",
        "guide/commands/registration",
        "guide/middleware",
        "guide/result-handler",
      ],
    },
    {
      type: "category",
      label: "Components",
      items: [
        "guide/components",
      ],
    },
    {
      type: "category",
      label: "External packages",
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
