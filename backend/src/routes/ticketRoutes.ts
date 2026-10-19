import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as TicketController from "../controllers/TicketController";

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

export default ticketRoutes;
