import { createTypedStringMenu } from "arcscord";

export const typedSingleStringSelectMenu = createTypedStringMenu({
  route: "typed_single_string_select_menu",
  build: id => ({
    customId: id(),
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
  }),
  run: (ctx) => {
    const selectedValue = ctx.values;

    return ctx.reply(`Selected typed single value ${selectedValue} !`);
  },
});
