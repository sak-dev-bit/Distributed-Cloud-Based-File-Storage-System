import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  createFileMetadataHandler,
  createFolderHandler,
  getFileMetadataHandler,
  listFolderHandler,
  softDeleteFileHandler
} from "./metadata.controller";

export const metadataRouter = Router();

// All metadata routes require authentication: this is user-specific storage.
metadataRouter.use(requireAuth);

// Folders
metadataRouter.post("/folders", createFolderHandler);
metadataRouter.get("/folders", listFolderHandler);

// Files metadata
metadataRouter.post("/files", createFileMetadataHandler);
metadataRouter.get("/files/:id", getFileMetadataHandler);
metadataRouter.delete("/files/:id", softDeleteFileHandler);

