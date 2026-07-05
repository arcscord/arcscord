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
        "guide/project-structure",
        "guide/commands",
        "guide/events",
        "guide/components",
      ],
    },
    {
      type: "category",
      label: "Migration",
      items: [
        "guide/migration/from-discordjs",
      ],
    },
    {
      type: "category",
      label: "Commands",
      items: [
        "guide/commands/slash",
        "guide/commands/options",
        "guide/commands/autocomplete",
        "guide/commands/context-menu",
        "guide/commands/subcommands",
        "guide/commands/permissions-contexts",
        "guide/commands/registration",
      ],
    },
    {
      type: "category",
      label: "Components",
      items: [
        "guide/components/button",
        "guide/components/select-menu",
        "guide/components/modal",
        "guide/components/components-v2",
      ],
    },
    {
      type: "category",
      label: "Additional features",
      items: [
        "guide/localization",
        "guide/logger",
        "guide/middleware",
        "guide/result-handler",
        "guide/error-handling",
      ],
    },
    {
      type: "category",
      label: "External packages",
      items: [
        "packages/arcscord",
        "packages/middleware",
        "packages/error",
        "packages/better-error",
      ],
    },
  ],
};

export default sidebars;
