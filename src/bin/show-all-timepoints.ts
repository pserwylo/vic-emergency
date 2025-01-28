import {fetchGeoJson, fetchUniqueTimePoints} from "../db";
import {createFeatureCollection} from "../create-feature-collection";
import fs from "node:fs";

const run = async () => {

  const timepoints = await fetchUniqueTimePoints();

  console.log(timepoints.map(d => d.toISOString()).join('\n'));

  timepoints.map(async d => {
    const result = await fetchGeoJson(d);
    const featureCollection = createFeatureCollection(result);
    fs.writeFileSync(`/tmp/feature.${d.toISOString()}.geojson`, JSON.stringify(featureCollection, null, "  "));
  });

};

run();
