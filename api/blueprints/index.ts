import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../../server/db.js';
import { applyCors } from '../../server/cors.js';
import { isAuthorized } from '../../server/auth.js';
import { listBlueprints } from '../../server/blueprints.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (!isAuthorized(req.headers['x-api-key'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const full = req.query.full === '1' || req.query.full === 'true';
    const data = await listBlueprints(getPool(), full);
    return res.status(200).json({ data });
  } catch (err) {
    console.error('GET /api/blueprints failed:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
