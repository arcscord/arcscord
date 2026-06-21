import { createTypedStringMenu } from "arcscord";

const typedStringSelectValues = {
  fun: {
    label: "Fun",
    description: "A fun option",
  },
  happy: {
    label: "Happy",
    description: "A happy option",
  },
} as const;

export const typedStringSelectMenu = createTypedStringMenu({
  route: "typed_string_select_menu",
  build: id => ({
    customId: id(),
    values: typedStringSelectValues,
    maxValues: 2,
  }),
  run: (ctx) => {
    const selectedValues: Array<keyof typeof typedStringSelectValues> = ctx.values;

    return ctx.reply(`Selected typed values ${selectedValues.join(", ")} !`);
  },
});
