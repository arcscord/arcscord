import { createTypedStringMenu } from "arcscord";

export const typedStringSelectMenu = createTypedStringMenu({
  route: "typed_string_select_menu",
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
  maxValues: 2,
  build: id => ({
    customId: id(),
  }),
  run: (ctx) => {
    const selectedValues = ctx.values;

    return ctx.reply(`Selected typed values ${selectedValues.join(", ")} !`);
  },
});
