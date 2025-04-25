import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// POST: Aceptar solicitud de amistad
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { fromUserId, toUserId } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ message: 'Faltan parámetros' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // Eliminar la solicitud y crear relación de amistad en ambos sentidos
    await session.run(`
      MATCH (from:Usuario {_id: $fromUserId})-[s:SOLICITUD_AMISTAD {estado: 'pendiente'}]->(to:Usuario {_id: $toUserId})
      DELETE s
      CREATE (from)-[:AMIGO]->(to)
      CREATE (to)-[:AMIGO]->(from)
    `, { fromUserId, toUserId });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error aceptando solicitud', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
