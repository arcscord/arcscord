import type { SelectMenuView } from "@arcscord/discord-ui";
import { ActionRow, Button, SelectMenu } from "@arcscord/discord-ui";
import { useState } from "react";
import styles from "./DiscordComponentExamples.module.css";
import { DiscordPreview } from "./DiscordPreview";

const buttonVariants = [
  { label: "Primary", style: "primary" },
  { label: "Secondary", style: "secondary" },
  { label: "Success", style: "success" },
  { label: "Danger", style: "danger" },
] as const;

export function ButtonExamples() {
  const [lastClick, setLastClick] = useState<{ label: string; count: number }>();

  function recordClick(label: string) {
    setLastClick(previous => ({ label, count: (previous?.count ?? 0) + 1 }));
  }

  return (
    <DiscordPreview className={styles.frame}>
      <ActionRow>
        {buttonVariants.map(({ label, style }) => (
          <Button key={style} label={label} style={style} onClick={() => recordClick(label)} />
        ))}
      </ActionRow>
      <ActionRow>
        <Button label="With Emoji" emoji="🎉" onClick={() => recordClick("With Emoji")} />
        <Button label="Disabled" style="secondary" disabled />
      </ActionRow>
      <p className={styles.status} role="status">
        {lastClick ? `${lastClick.label} clicked. Total clicks: ${lastClick.count}.` : "Click a button to try it."}
      </p>
    </DiscordPreview>
  );
}

const users = [
  { entityType: "user", id: "ada", displayName: "Ada", username: "ada" },
  { entityType: "user", id: "lin", displayName: "Lin", username: "lin" },
] as const;

const roles = [
  { entityType: "role", id: "moderator", name: "Moderator", color: "#9b59b6" },
  { entityType: "role", id: "member", name: "Member", color: "#3498db" },
] as const;

const menuExamples: readonly { title: string; menu: SelectMenuView }[] = [
  {
    title: "String Select",
    menu: {
      id: "category",
      kind: "string-select",
      placeholder: "Choose a category…",
      options: [
        { label: "Commands", value: "commands", description: "Slash commands & context menus" },
        { label: "Components", value: "components", description: "Buttons, selects, modals" },
        { label: "Events", value: "events" },
      ],
    },
  },
  {
    title: "User Select",
    menu: { id: "user", kind: "user-select", placeholder: "Choose a user…", entities: users },
  },
  {
    title: "Role Select",
    menu: { id: "role", kind: "role-select", placeholder: "Choose a role…", entities: roles },
  },
  {
    title: "Mentionable Select",
    menu: { id: "mentionable", kind: "mentionable-select", placeholder: "Choose a user or role…", entities: [...users, ...roles] },
  },
  {
    title: "Channel Select",
    menu: {
      id: "channel",
      kind: "channel-select",
      placeholder: "Choose a channel…",
      entities: [
        { entityType: "channel", id: "general", name: "general", channelType: 0 },
        { entityType: "channel", id: "voice", name: "Voice", channelType: 2 },
      ],
    },
  },
];

function selectionLabel(menu: SelectMenuView, value: string | undefined) {
  if (menu.kind === "string-select")
    return menu.options.find(option => option.value === value)?.label;

  const entity = menu.entities.find(option => option.id === value);
  return entity?.entityType === "user" ? entity.displayName : entity?.name;
}

function SelectExample({ title, menu }: { title: string; menu: SelectMenuView }) {
  const [selectedLabel, setSelectedLabel] = useState<string>();

  return (
    <div className={styles.selectExample}>
      <p className={styles.label}>{title}</p>
      <ActionRow>
        <SelectMenu menu={menu} onChange={([value]) => setSelectedLabel(selectionLabel(menu, value))} />
      </ActionRow>
      <p className={styles.status} role="status" aria-label={`${title} result`}>
        {selectedLabel ? `Selected: ${selectedLabel}` : "Nothing selected."}
      </p>
    </div>
  );
}

export function SelectMenuExamples() {
  return (
    <DiscordPreview className={styles.frame}>
      <div className={styles.selectGrid}>
        {menuExamples.map(({ title, menu }) => (
          <SelectExample key={menu.id} title={title} menu={menu} />
        ))}
      </div>
    </DiscordPreview>
  );
}
