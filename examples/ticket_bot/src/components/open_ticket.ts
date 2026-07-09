import { button, createButton } from "arcscord";
import { ticketOpenModal } from "./open_modal";

/**
 * The persistent "Open a ticket" button on the dashboard.
 *
 * On click it opens the ticket modal. All the modal's labels/placeholders are
 * resolved here with `ctx.t` and passed into `ticketOpenModal.build(...)`, so the
 * modal is localized in the clicking user's language.
 */
export const openTicketButton = createButton({
  route: "open_ticket",
  build: (id, label) =>
    button({
      label,
      style: "primary",
      customId: id(),
    }),
  run: async (ctx) => {
    return ctx.showModal(ticketOpenModal.build({
      title: ctx.t($ => $.ticket.modals.ticket_open.title),
      categoryLabel: ctx.t($ => $.ticket.modals.ticket_open.category_label),
      categorySupport: ctx.t($ => $.ticket.modals.ticket_open.categorySupport),
      categoryBugReport: ctx.t($ => $.ticket.modals.ticket_open.categoryBugReport),
      categoryOther: ctx.t($ => $.ticket.modals.ticket_open.categoryOther),
      reasonLabel: ctx.t($ => $.ticket.modals.ticket_open.reason_label),
      reasonDescription: ctx.t($ => $.ticket.modals.ticket_open.reasonDescription),
      reasonPlaceholder: ctx.t($ => $.ticket.modals.ticket_open.reasonPlaceholder),
    }));
  },
});
