import { createTypedStringMenu } from "arcscord";

export const typedSingleStringSelectMenu = createTypedStringMenu({
  route: "typed_single_string_select_menu",
  values: {
    fun: {
      label: "Fun",
      description: "A fun option",
    },
    happy: {
      label: "Happy",
      description: "A happy option",
    },
  } as const,
  maxValues: 1,
  build: id => ({
    customId: id(),
  }),
  run: (ctx) => {
    const selectedValue = ctx.values;

    return ctx.reply(`Selected typed single value ${selectedValue} !`);
  },
});
