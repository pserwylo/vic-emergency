import express from 'express';
import logger from '../logger';
import {fetchGeoJson, fetchUniqueTimePoints} from "../db";
import {createFeatureCollection} from "../create-feature-collection";
import {CronJob} from "cron";
import {fetchGeojson} from "../fetch-geojson";
import {maybeImportGeoJson} from "../import-geojson";
import {AxiosError} from "axios";


const app = express()

app.use(express.static(__dirname + '/../../public'));

const port = 3000

app.get('/api/features/dates', async (req, res) => {
    const timePoints = await fetchUniqueTimePoints();
    res.json(timePoints.map(d => d.toISOString()));
})

app.get('/api/features/:date/geojson', async (req, res) => {
    const date = new Date(req.params.date);
    const geoJson = await fetchGeoJson(date);

    const featureCollection = createFeatureCollection(geoJson);
    res.json(featureCollection);
})

const cronMins = 10;
CronJob.from({
    cronTime: `*/${cronMins} * * * *`,
    onTick: async function () {
        try {
            const geojson = await fetchGeojson();
            maybeImportGeoJson(geojson);
        } catch (e) {
            if (e instanceof AxiosError) {
                logger.error(`Error fetching geojson: ${e.message}`)
            } else {
                logger.error(`Error fetching geojson`)
            }
        }
        logger.info(`Will check again in ${cronMins} minutes.`);
    },
    start: true,
    timeZone: 'Australia/Melbourne'
});

app.listen(port, () => {
    logger.info(`Listening on port ${port}`)
});