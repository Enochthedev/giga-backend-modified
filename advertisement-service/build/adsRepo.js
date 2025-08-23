"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdsTable = initAdsTable;
exports.createAd = createAd;
exports.listAds = listAds;
exports.getAd = getAd;
exports.deleteAd = deleteAd;
exports.updateAd = updateAd;
exports.recordImpression = recordImpression;
exports.serveAd = serveAd;
const pg_1 = require("pg");
// Simple database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/postgres',
});
async function initAdsTable() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0
    )`);
        console.log('Ads table initialized');
    }
    catch (error) {
        console.error('Error initializing ads table:', error);
    }
}
async function createAd(title, content, userId) {
    const res = await pool.query('INSERT INTO ads (title, content, created_by) VALUES ($1,$2,$3) RETURNING id, title, content, created_by, impressions, clicks', [title, content, userId]);
    return res.rows[0];
}
async function listAds() {
    const res = await pool.query('SELECT id, title, content, created_by, impressions, clicks FROM ads');
    return res.rows;
}
async function getAd(id) {
    const res = await pool.query('SELECT id, title, content, created_by, impressions, clicks FROM ads WHERE id=$1', [id]);
    return res.rows[0] || null;
}
async function deleteAd(id) {
    await pool.query('DELETE FROM ads WHERE id=$1', [id]);
}
async function updateAd(id, title, content) {
    const res = await pool.query('UPDATE ads SET title=$1, content=$2 WHERE id=$3 RETURNING id, title, content, created_by, impressions, clicks', [title, content, id]);
    return res.rows[0] || null;
}
async function recordImpression(id) {
    await pool.query('UPDATE ads SET impressions = impressions + 1 WHERE id=$1', [id]);
}
async function serveAd() {
    const res = await pool.query('SELECT id, title, content, created_by, impressions, clicks FROM ads ORDER BY impressions ASC, RANDOM() LIMIT 1');
    const ad = res.rows[0] || null;
    if (ad) {
        await recordImpression(ad.id);
        ad.impressions++;
    }
    return ad;
}
//# sourceMappingURL=adsRepo.js.map