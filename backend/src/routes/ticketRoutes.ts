import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as TicketController from "../controllers/TicketController";
import * as TicketNoteController from "../controllers/TicketNoteController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.delete(
  "/tickets/:ticketId",
  isAuth,
  isAdmin,
  TicketController.remove
);

ticketRoutes.get(
  "/tickets/:ticketId/notes",
  isAuth,
  TicketNoteController.index
);
ticketRoutes.post(
  "/tickets/:ticketId/notes",
  isAuth,
  TicketNoteController.store
);
ticketRoutes.delete(
  "/tickets/:ticketId/notes/:noteId",
  isAuth,
  TicketNoteController.remove
);

export default ticketRoutes;
