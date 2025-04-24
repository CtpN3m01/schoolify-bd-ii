import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// POST: Eliminar amigo (elimina ambas relaciones AMIGO)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId, friendId } = req.body;
  if (!userId || !friendId) {
    return res.status(400).json({ message: 'Faltan parámetros' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    await session.run(`
      MATCH (a:Usuario {_id: $userId})-[r:AMIGO]-(b:Usuario {_id: $friendId})
      DELETE r
    `, { userId, friendId });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando amigo', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
