import { AbstractionChainService } from "../../services/abstraction-chain.service";
import { FsFile, type ContentType } from "filehub";
import { type UploadFile } from "./megahub.routes";
import type { AppRouteHandler } from "@/lib/types";
import { getWalletAddress } from "@/lib/context-fetcher";

export const uploadFileHandler: AppRouteHandler<UploadFile> = async (c) => {
  const account = getWalletAddress(c);
  const { file, contentType } = c.req.valid('json');
  const fileBuffer = Buffer.from(file, 'base64');
  const fsFile = FsFile.fromData(fileBuffer, { 'Content-Type': contentType as ContentType });
  
  await AbstractionChainService.uploadFile(fsFile.data, contentType, account);

  return c.json({ success: true, hash: fsFile.hash.toString('hex') }, 201);
}; 