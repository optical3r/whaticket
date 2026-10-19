import rateLimit from "express-rate-limit";

// Slows down password guessing on the public auth endpoints.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "ERR_TOO_MANY_REQUESTS" }
});

export default authRateLimit;
