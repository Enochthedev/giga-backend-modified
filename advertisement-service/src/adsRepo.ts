import { db } from 'common';

export interface Ad {
  id: number;
  title: string;
  content: string;
  created_by: string;
  impressions: number;
  clicks: number;
}

export async function initAdsTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS ads (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0
  )`);
}

export async function createAd(title: string, content: string, userId: string): Promise<Ad> {
  const res = await db.query(
    'INSERT INTO ads (title, content, created_by) VALUES ($1,$2,$3) RETURNING id, title, content, created_by, impressions, clicks',
    [title, content, userId]
  );
  return res.rows[0];
}

export async function listAds(): Promise<Ad[]> {
  const res = await db.query('SELECT id, title, content, created_by, impressions, clicks FROM ads');
  return res.rows;
}

export async function getAd(id: number): Promise<Ad | null> {
  const res = await db.query('SELECT id, title, content, created_by, impressions, clicks FROM ads WHERE id=$1', [id]);
  return res.rows[0] || null;
}

export async function deleteAd(id: number): Promise<void> {
  await db.query('DELETE FROM ads WHERE id=$1', [id]);
}

export async function updateAd(id: number, title: string, content: string): Promise<Ad | null> {
  const res = await db.query(
    'UPDATE ads SET title=$1, content=$2 WHERE id=$3 RETURNING id, title, content, created_by, impressions, clicks',
    [title, content, id]
  );
  return res.rows[0] || null;
}

export async function recordImpression(id: number): Promise<void> {
  await db.query('UPDATE ads SET impressions = impressions + 1 WHERE id=$1', [id]);
}

export async function serveAd(): Promise<Ad | null> {
  const res = await db.query(
    'SELECT id, title, content, created_by, impressions, clicks FROM ads ORDER BY impressions ASC, RANDOM() LIMIT 1'
  );
  const ad = res.rows[0] || null;
  if (ad) {
    await recordImpression(ad.id);
    ad.impressions++;
  }
  return ad;
}
