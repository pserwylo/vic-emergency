import fs from "node:fs";
import path from "node:path";
import { downloadDir } from "../config";
import { hashGeojson } from "../hash-geojson";
import { ensureDataDirExists, hashExists } from "../files";
import logger from "../logger";
import { fetchGeojson } from "../fetch-geojson";

const run = async () => {
  ensureDataDirExists();

  const geojson = await fetchGeojson();
  const hash = hashGeojson(geojson);

  if (!(await hashExists(hash, downloadDir))) {
    logger.debug(`GeoJSON with hash ${hash} doesn't yet exist.`);

    const filename = `${new Date().toISOString()}.${hash}.geojson`;
    const geojsonString = JSON.stringify(geojson, null, "  ");

    logger.info(`Saving ${geojsonString.length} bytes to ${filename}`);
    fs.writeFileSync(path.join(downloadDir, filename), geojsonString);
  } else {
    logger.info(`GeoJSON with hash ${hash} already exists.`);
  }
};

run();
