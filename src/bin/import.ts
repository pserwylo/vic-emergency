import fs from "node:fs";
import logger from "../logger";
import {EmergencyVicProperties} from "../fetch-geojson";
import {deactivateRemovedFeatures, upsertFeature} from "../db";
import {Feature, GeoJSON, Geometry} from "geojson";
import { glob } from "glob";

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
    if (geoJson.type !== 'FeatureCollection') {
      logger.warn(`Expected FeatureCollection in ${file} but found ${geoJson.type}. Skipping file.`)
    } else {
      // @ts-ignore
      const updateDate = new Date(geoJson['properties'].lastUpdated)

      // Parallel version, harder to follow the logs. Enable again when stable.
      /*const jobs = geoJson.features.map((f) => {
        const feature = f as Feature<Geometry, EmergencyVicProperties>
        return upsertFeature(feature, updateDate);
      });

      await Promise.all(jobs);*/

      for (let j = 0; j < geoJson.features.length; j ++) {
        const feature = geoJson.features[j] as Feature<Geometry, EmergencyVicProperties>
        await upsertFeature(feature, updateDate);
      }

      /*const jobs = geoJson.features.map((f) => {
        const feature = f as Feature<Geometry, EmergencyVicProperties>
        return upsertFeature(feature, updateDate);
      });

      await Promise.all(jobs);*/

      const removedFeatures = await deactivateRemovedFeatures(geoJson.features as Feature<Geometry, EmergencyVicProperties>[], updateDate)
      if (removedFeatures.length > 0) {
        logger.info(`Removed features no longer present: ["${removedFeatures.join('", "')}"]`);
      }
    }
  }

};

run();
