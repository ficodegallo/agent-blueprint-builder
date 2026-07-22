import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../server/db';
import { isAuthorized } from '../server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req.headers['x-api-key'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await getPool().query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blueprints') AS migrated"
    );
    return res.status(200).json({ ok: true, migrated: result.rows[0]?.migrated === true });
  } catch (err) {
    console.error('GET /api/health failed:', err);
    return res.status(500).json({ ok: false, error: 'Database unreachable' });
  }
}
