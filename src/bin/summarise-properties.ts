import { GeoJSON } from "geojson";
import { fetchGeojson } from "../fetch-geojson";
import logger from "../logger";

/**
 * For each property in the FeatureCollection "properties" object, count up how many times
 * each value appears. This helps to figure out what possible values each field can take.
 * @param geojson
 */
const summariseFeatureCollectionProperties = (geojson: GeoJSON) => {
  if (geojson.type !== "FeatureCollection") {
    throw new Error("Expected geojson to be of type FeatureCollection.");
  }

  const propertiesCount = new Map<string, Map<any, number>>();
  const features = geojson.features.map((feature) => feature.properties);

  const props: string[] = [
    "status",
    "feedType",
    "sourceOrg",
    "sourceId",
    "sourceFeed",
    "sourceTitle",
    "id",
    "category1",
    "category2",
    "created",
    "updated",
    "location",
  ];

  features.forEach((feature) => {
    props.forEach((prop: any) => {
      const value = feature![prop];
      const existingProperties =
        propertiesCount.get(prop) ?? new Map<string, number>();
      const count = existingProperties.get(value) ?? 0;
      existingProperties.set(value, count + 1);
      propertiesCount.set(prop, existingProperties);
    });
  });

  return propertiesCount;
};

const run = async () => {
  const geojson = await fetchGeojson();
  const summary = summariseFeatureCollectionProperties(geojson);

  logger.info("GeoJSON FeatureCollection property summary:");
  logger.info(JSON.stringify(summary, replacer, "  "));
};

function replacer(key: string, value: any) {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  } else {
    return value;
  }
}

run();
