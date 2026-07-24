import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../../server/db';
import { applyCors } from '../../server/cors';
import { isAuthorized } from '../../server/auth';
import {
  deleteBlueprint,
  getBlueprint,
  upsertBlueprint,
  validateBlueprint,
  MAX_BODY_BYTES,
} from '../../server/blueprints';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (!isAuthorized(req.headers['x-api-key'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Missing blueprint id' });
  }

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const blueprint = await getBlueprint(pool, id);
      if (!blueprint) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: blueprint });
    }

    if (req.method === 'PUT') {
      const size = Buffer.byteLength(JSON.stringify(req.body ?? ''));
      if (size > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Blueprint too large' });
      }
      const result = validateBlueprint(req.body);
      if (!result.ok) return res.status(400).json({ error: result.error });
      if (result.blueprint.id !== id) {
        return res.status(400).json({ error: 'Body id does not match URL id' });
      }
      await upsertBlueprint(pool, result.blueprint);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await deleteBlueprint(pool, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`${req.method} /api/blueprints/${id} failed:`, err);
    return res.status(500).json({ error: 'Database error' });
  }
}
