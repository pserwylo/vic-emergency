import express from 'express';
import logger from '../logger';
import {fetchGeoJson, fetchUniqueTimePoints} from "../db";
import {createFeatureCollection} from "../create-feature-collection";


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

app.listen(port, () => {
    logger.info(`Listening on port ${port}`)
})