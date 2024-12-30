const request = require("request");
const sqlite3 = require("sqlite3").verbose();
const { createHash } = require('crypto');

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE impacted_area (\n" +
			"    geojson text                               not null,\n" +
			"    geojson_sha256 text                        not null,\n" +
			"    date    datetime default CURRENT_TIMESTAMP not null\n" +
			"    constraint impacted_area_hash unique on conflict ignore\n" +
			")");
		callback(db);
	});
}

function updateRow(db, geojson, geojsonHash) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO impacted_area (geojson, geojson_sha256) VALUES (?, ?)");
	statement.run(geojson, geojsonHash);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, geojson, geojson_sha256 FROM impacted_area", function(err, row) {
		console.log(row.geojson_sha256);
	});
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	fetchPage("https://emergency.vic.gov.au/public/impact-areas-geojson.json", function (geojson) {
		const hash = createHash('sha256').update(geojson).digest('hex');
		updateRow(db, geojson, hash);
		readRows(db);
		db.close();
	});
}

initDatabase(run);
