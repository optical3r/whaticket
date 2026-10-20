import { Router } from "express";
import sequelize from "../database";
import { queueHealth } from "../libs/queue";

const healthRoutes = Router();

// For load balancers and uptime monitors. Exposes no data.
healthRoutes.get("/health", async (req, res) => {
  let database: "ok" | "down" = "ok";
  try {
    await sequelize.authenticate();
  } catch {
    database = "down";
  }

  const queue = await queueHealth();
  const healthy = database === "ok" && queue !== "down";

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
    queue
  });
});

export default healthRoutes;
