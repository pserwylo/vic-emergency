import {FeatureCollection, Geometry} from "geojson";

export const createFeatureCollection = (geoJson: { id: string, location: string | null, geometry: string }[]) => {
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

    return collection;
}
