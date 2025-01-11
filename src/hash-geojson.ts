import {GeoJSON, Geometry} from "geojson";
import { createHash } from "crypto";

export const hashGeojson = (geojson: GeoJSON) => {
  // The feed from vic emergency updates the "properties" field every few seconds.
  // If you download two copies, the only difference is often the "properties.lastUpdated"
  // field, which is not really important if we are hashing the actual contents to.
  // Other times, the "properties.featureCount" increments, even though the body of the
  // GeoJSON is identical.
  // Therefore, remove the "properties" before hashing.
  const toHash: GeoJSON = { ...geojson };
  if (toHash.type === "FeatureCollection") {
    // @ts-ignore
    delete toHash["properties"];
  }
  return hashJson(toHash);
};

export const hashGeometry = (geometry: Geometry) => {
  return hashJson(geometry);
}

const hashJson = (json: any) => {
  return createHash("sha256").update(JSON.stringify(json)).digest("hex");
}
