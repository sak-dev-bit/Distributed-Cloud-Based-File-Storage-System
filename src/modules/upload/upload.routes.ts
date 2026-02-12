import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware";
import { singleUploadHandler, chunkedUploadHandler } from "./upload.controller";

// For now we keep uploads in memory; for very large files you'd want disk or direct-to-S3 streaming.
const upload = multer({ storage: multer.memoryStorage() });

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

// Single file upload: multipart/form-data with a single "file" field.
uploadRouter.post("/single", upload.single("file"), singleUploadHandler);

// Chunked upload: multipart/form-data with multiple "chunks" fields.
uploadRouter.post("/chunks", upload.array("chunks"), chunkedUploadHandler);

