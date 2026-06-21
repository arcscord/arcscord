import { createTypedStringMenu } from "arcscord";

const typedSingleStringSelectValues = {
  fun: {
    label: "Fun",
    description: "A fun option",
  },
  happy: {
    label: "Happy",
    description: "A happy option",
  },
} as const;

export const typedSingleStringSelectMenu = createTypedStringMenu({
  route: "typed_single_string_select_menu",
  build: id => ({
    customId: id(),
    values: typedSingleStringSelectValues,
    maxValues: 1,
  }),
  run: (ctx) => {
    const selectedValue: keyof typeof typedSingleStringSelectValues = ctx.values;

    return ctx.reply(`Selected typed single value ${selectedValue} !`);
  },
});
