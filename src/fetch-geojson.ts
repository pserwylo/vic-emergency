import { GeoJSON } from "geojson";
import axios from "axios";
import logger from "./logger";
import { geoJsonUrl } from "./config";

export const fetchGeojson = async (): Promise<GeoJSON> => {
  logger.debug(`Downloading GeoJSON from ${geoJsonUrl}`);
  const response = await axios.get(geoJsonUrl);
  return response.data;
};

/**
 * Properties inferred by running `npm run download:summarise-properties` and figuring out
 * what types of values each property tends to take.
 */
export type EmergencyVicProperties = {
  status: "Unknown"; // Same for all 251
  feedType: "burn-area"; // Same for all 251
  sourceOrg: "VIC/DELWP"; // Same for all 251
  sourceId: string; // Each was a unique string such as '32b889c568e1dd7790f818c51e439dbc' (all the same length)
  sourceFeed: "burn-area"; // Same for all 251

  /**
   * Lots of different types of entries, ranging from:
   *  + Road name (e.g. "Sobeys Rd", "River Rd", "Mallee Hwy", etc).
   *  + "Unnamed Fire - 185729"
   *  + Some variation of district/region + number + town + road (e.g. "Goulburn 16 - Shepparton East - Broken River Channel Road")
   */
  sourceTitle: string;
  id: string; // Seems to be the same as "sourceId"
  category1: "Burn Area"; // Same for all 251
  category2: "Burn Area"; // Same for all 251
  created: string; // In the format '2024-12-14T00:00:00.000Z'
  updated: string; // In the format '2024-12-14T00:00:00.000Z'
  location: string; // Same as "sourceTitle"
};
