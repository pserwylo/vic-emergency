import { DB } from './db.types' // this is the Database interface we defined earlier
import SQLite from 'better-sqlite3'
import {Kysely, SqliteDialect} from 'kysely'
import path from 'node:path';
import {Feature, Geometry} from "geojson";
import {EmergencyVicProperties} from "./fetch-geojson";
import {hashGeometry} from "./hash-geojson";
import logger from "./logger";

const dialect = new SqliteDialect({
    database: new SQLite(path.join(__dirname, '..', 'data.sqlite')),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
    dialect,
})

export const fetchUniqueTimePoints = async ()=> {
    const createdAtQuery = db.selectFrom('geometry')
        .select(['created_at as time_point'])
        .where('created_at', 'is not', null);

    const removedAtQuery = db.selectFrom('geometry')
        .select(['removed_at as time_point'])
        .where('removed_at', 'is not', null);

    // @ts-ignore It thinks removed_at is string|null, but there is a "WHERE is not null"
    const dates = await createdAtQuery.union(removedAtQuery)
        .distinct()
        .execute();

    return dates.map((d) => new Date(d.time_point));
}

export const fetchGeoJson = async (date: Date) => {
    const query = db.selectFrom('feature')
        .innerJoin('geometry', 'feature.id', 'geometry.feature_id')
        .where((eb) =>
            eb.and([
                eb('feature.created_at', '<=', date.toISOString()),
                eb.or([
                    eb('feature.removed_at', 'is', null),
                    eb('feature.removed_at', '>', date.toISOString()),
                ]),
            ])
        )
        .where((eb) =>
            eb.and([
                eb('geometry.created_at', '<=', date.toISOString()),
                eb.or([
                    eb('geometry.removed_at', 'is', null),
                    eb('geometry.removed_at', '>', date.toISOString()),
                ]),
            ])
        )
        .select(['feature.id', 'feature.location', 'geometry.geometry']);

    return await query.execute();
}

export const deactivateRemovedFeatures = async (activeFeatures: Feature<Geometry, EmergencyVicProperties>[], updateDate: Date) => {
    const deactivatedFeatures = await db.updateTable('feature')
        .set({
            removed_at: updateDate.toISOString(),
        })
        .where('id', 'not in', activeFeatures.map(f => f.properties.id))
        .where('removed_at', 'is', null)
        .returning('id')
        .execute();

    const deactivatedFeatureIds = deactivatedFeatures.map(f => f.id);

    await db.updateTable('geometry')
        .set({
            removed_at: updateDate.toISOString(),
        })
        .where('feature_id', 'in', deactivatedFeatureIds)
        .where('removed_at', 'is', null)
        .execute();

    return deactivatedFeatureIds;
}

export const upsertFeature = async (featureGeoJson: Feature<Geometry, EmergencyVicProperties>, updateDate: Date) => {
    const id = featureGeoJson.properties.id;

    const feature = await findFeature(id);

    if (feature === undefined) {
        await insertNewFeature(featureGeoJson, updateDate);
    } else if (feature.removed_at != null) {
        logger.warn(`Feature ${id} already in DB, but has been removed.`);
    } else {
        await updateExistingFeature(feature, featureGeoJson, updateDate);
    }
}

const updateExistingFeature = async (existingFeature: FeatureDTO, featureGeoJson: Feature<Geometry, EmergencyVicProperties>, updateDate: Date) => {
    const id = featureGeoJson.properties.id;
    logger.debug(`Updating existing feature ${id}.`);

    if (existingFeature.location !== featureGeoJson.properties.location) {
        logger.info(`Updating location for feature ${id} to "${featureGeoJson.properties.location}"`);
        await db.updateTable('feature').set({
            location: featureGeoJson.properties.location,
        }).where('id', '=', id).execute();
    }

    const geometryHash = hashGeometry(featureGeoJson.geometry);
    const matchingGeometry = await findGeometryByFeatureAndHash(id, geometryHash);

    if (matchingGeometry != null) {
        logger.debug(`No need to update geometry, already exists with hash ${geometryHash}`);
    } else {
        logger.info(`Geometry for feature ${id} has been updated. This makes previous geometry no longer needed. Deactivating old geometry.`);
        await deactivateGeometryForFeature(id, updateDate);

        logger.info(`Inserting new geometry for feature ${id} (after deactivating old geometry).`)
        await insertGeometry(id, updateDate, featureGeoJson.geometry);
    }
}

const insertNewFeature = async (featureGeoJson: Feature<Geometry, EmergencyVicProperties>, updatedDate: Date) => {
    const id = featureGeoJson.properties.id;
    logger.info(`Inserting new feature ${id}`)
    await db.insertInto('feature').values({
        id,
        location: featureGeoJson.properties.location,
        created_at: updatedDate.toISOString(),
        updated_at: updatedDate.toISOString(),
    }).execute();

    logger.debug(`Inserting geometry for new feature ${id}`)
    await insertGeometry(id, updatedDate, featureGeoJson.geometry);
}

const deactivateGeometryForFeature = async (id: string, updateDate: Date) => {
    logger.debug('Finding previous (active) geometry to mark it as inactive.');

    // Only really expet there to be one record here, but we pull back an array just in case.
    const activeGeometryToDeactivate = await findActiveGeometryByFeature(id);

    if (activeGeometryToDeactivate.length === 0) {
        logger.warn(`Deactivating feature ${id} but no active geometry found.`)
    } else {
        const activeGeometryHashes = activeGeometryToDeactivate.map((g) => g.hash);

        logger.debug(`Deactivating geometry for feature ${id}: ["${activeGeometryHashes.join('", "')}"]`);
        await updateGeometryDeactivate(activeGeometryHashes, updateDate);
    }
}

const insertGeometry = async(featureId: string, created: Date, geometry: Geometry) => {
    const hash = hashGeometry(geometry)
    await db.insertInto('geometry').values({
        feature_id: featureId,
        hash,
        created_at: created.toISOString(),
        geometry: JSON.stringify(geometry),
    }).execute();
}

type FeatureDTO = {
    id: string;
    location: string | null;
    created_at: string;
    updated_at: string;
    removed_at: string | null;
}

const findFeature = async (id: string): Promise<FeatureDTO | undefined> => {
    return await db.selectFrom('feature')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
}

const findActiveGeometryByFeature = async (id: string) => {
    return await db.selectFrom('geometry')
        .selectAll()
        .where('feature_id', '=', id)
        .where('removed_at', 'is', null)
        .execute();
}

const findGeometryByFeatureAndHash = async (id: string, geometryHash: string) => {
    return await db.selectFrom('geometry')
        .selectAll()
        .where('feature_id', '=', id)
        .where('hash', '=', geometryHash)
        .executeTakeFirst();
}

const updateGeometryDeactivate = async (hashes: string[], updateDate: Date) => {
    await db.updateTable('geometry')
        .set({removed_at: updateDate.toISOString()})
        .where('hash', 'in', hashes)
        .execute();
}