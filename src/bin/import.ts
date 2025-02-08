import fs from "node:fs";
import logger from "../logger";
import {GeoJSON} from "geojson";
import { glob } from "glob";
import {maybeImportGeoJson} from "../import-geojson";

const printUsage = () => {
  console.log('Usage: ./import.ts file-to-import [files-to-import...]');
  process.exit(-1);
}

const run = async () => {

  const fileGlobs = await Promise.all(process.argv.slice(2).map((f) => glob(f).then(list => list.sort())));
  const files = fileGlobs.reduce((acc, list) => ([...acc, ...list]), []);

  if (files.length === 0) {
    printUsage();
  }

  const nonExistentFiles = files.filter(f => !fs.existsSync(f));
  if (nonExistentFiles.length > 0) {
    console.log('Files do not exist:');
    nonExistentFiles.forEach(console.log);
    printUsage();
  }

  for (let i = 0; i < files.length; i ++) {
    const file = files[i];

    logger.info(`Importing ${file}`)
    const geoJsonString = fs.readFileSync(file, { encoding: 'utf-8' });
    const geoJson: GeoJSON = JSON.parse(geoJsonString);

    await maybeImportGeoJson(geoJson);
  }

};

run();
