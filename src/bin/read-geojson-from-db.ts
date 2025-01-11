import {fetchGeoJson} from "../db";
import {FeatureCollection, Geometry} from "geojson";

const printUsage = () => {
  console.log('Usage: ./read-geojson-from-db.ts [ISO_DATE]');
  process.exit(-1);
}

const run = async () => {

  const args = process.argv.slice(2);

  if (args.length > 1) {
    printUsage();
  }

  let date: Date = new Date();
  if (args.length > 0) {
    try {
      date = new Date(args[0])
    } catch (e) {
      console.log(`Unable to parse date "${args[0]}. Should be in ISO format.`)
      printUsage();
    }
  }

  const geoJson = await fetchGeoJson(date);

  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: geoJson.map((f) => ({
      type: 'Feature',
      id: f.id,
      properties: {
        location: f.location,
      },
      geometry: JSON.parse(f.geometry) as Geometry,
    }))
  }

  console.log(JSON.stringify(collection, null,  "  "));

};

run();
