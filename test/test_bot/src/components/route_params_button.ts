import { buildClickableButton, createButton } from "arcscord";

export const routeParamsButton = createButton({
  route: "route_params/{userId}/{filter}",
  build: (id, userId, filter) =>
    buildClickableButton({
      label: "Route Params",
      style: "primary",
      customId: id({ userId, filter }),
    }),
  run: (ctx) => {
    return ctx.reply({
      content: `Route params: user=${ctx.params.userId}, filter=${ctx.params.filter}`,
      ephemeral: true,
    });
  },
});
