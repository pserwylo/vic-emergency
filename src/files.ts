import path from "node:path";
import { glob } from "glob";
import fs from "node:fs";
import { downloadDir } from "./config";
import logger from "./logger";

export const ensureDataDirExists = () => {
  if (!fs.existsSync(downloadDir)) {
    logger.debug(`Creating dir ${downloadDir}`);
    fs.mkdirSync(downloadDir);
  } else {
    logger.debug(`Dir ${downloadDir} exists`);
  }
};

export const hashExists = async (hash: string, downloadDir: string) => {
  const globPath = path.join(downloadDir, `*.${hash}.geojson`);
  logger.debug(`Checking if "${globPath}" exists`);
  const files = await glob(globPath);
  return files.length > 0;
};

export const listDownloads = async (downloadDir: string) => {
  const globPath = path.join(downloadDir, `*.geojson`);
  return await glob(globPath);
};
