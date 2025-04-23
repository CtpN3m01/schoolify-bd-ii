import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyConnection } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  try {
    await verifyConnection();
    return res.status(200).json({ success: true, message: 'Conexión exitosa a Neo4j' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error conectando a Neo4j', error: (error as Error).message });
  }
}
