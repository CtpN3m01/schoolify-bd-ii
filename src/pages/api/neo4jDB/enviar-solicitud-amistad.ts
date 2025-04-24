import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// POST: Enviar solicitud de amistad en Neo4j
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { fromUserId, toUserId } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // Verificar si ya existe una solicitud pendiente o amistad
    const check = await session.run(
      `MATCH (a:Usuario {_id: $fromUserId})-[r]->(b:Usuario {_id: $toUserId})
       WHERE type(r) IN ['SOLICITUD_AMISTAD', 'AMIGO']
       RETURN r LIMIT 1`,
      { fromUserId, toUserId }
    );
    if (check.records.length > 0) {
      return res.status(409).json({ message: 'Ya existe una solicitud o amistad' });
    }
    // Crear la solicitud de amistad
    await session.run(
      `MATCH (a:Usuario {_id: $fromUserId}), (b:Usuario {_id: $toUserId})
       CREATE (a)-[:SOLICITUD_AMISTAD {estado: 'pendiente', fecha: datetime()}]->(b)`,
      { fromUserId, toUserId }
    );
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error enviando solicitud', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
