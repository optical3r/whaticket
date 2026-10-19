import express from "express";
import uploadConfig from "../config/upload";
import isSignedMedia from "../middleware/isSignedMedia";

const mediaRoutes = express.Router();

mediaRoutes.get(
  "/:expiry/:signature/:filename",
  isSignedMedia,
  express.static(uploadConfig.directory, { index: false })
);

export default mediaRoutes;
