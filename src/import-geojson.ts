import {Feature, GeoJSON, Geometry} from "geojson";
import logger from "./logger";
import {EmergencyVicProperties} from "./fetch-geojson";
import {deactivateRemovedFeatures, hashExists, insertJob, upsertFeature} from "./db";
import {hashGeojson} from "./hash-geojson";

export const maybeImportGeoJson = async (geoJson:GeoJSON) => {
    const hash = hashGeojson(geoJson);
    if (!(await hashExists(hash))) {
        logger.info(`GeoJSON with hash ${hash} doesn't yet exist.`);
        await insertJob(hash);
        await importGeoJson(geoJson)
    } else {
        logger.info(`GeoJSON with hash ${hash} already exists.`);
    }
}

export const importGeoJson = async (geoJson: GeoJSON) => {
    if (geoJson.type !== 'FeatureCollection') {
        logger.warn(`Expected FeatureCollection but found ${geoJson.type}. Skipping import.`)
    } else {
        // @ts-ignore
        const updateDate = new Date(geoJson['properties'].lastUpdated)

        // Parallel version, harder to follow the logs. Enable again when stable.
        /*const jobs = geoJson.features.map((f) => {
          const feature = f as Feature<Geometry, EmergencyVicProperties>
          return upsertFeature(feature, updateDate);
        });

        await Promise.all(jobs);*/

        for (let j = 0; j < geoJson.features.length; j++) {
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
