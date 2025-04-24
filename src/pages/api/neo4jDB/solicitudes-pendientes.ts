import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// GET: Solicitudes de amistad recibidas para un usuario
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Falta userId' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (from:Usuario)-[s:SOLICITUD_AMISTAD {estado: 'pendiente'}]->(to:Usuario {_id: $userId})
      RETURN from._id AS id, from.nombre AS name, from.foto AS avatar, from.estado AS status, from.descripcion AS description, from.universidad AS university, s.fecha AS fechaSolicitud
    `, { userId });
    const solicitudes = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      avatar: r.get('avatar'),
      status: r.get('status') || 'Desconocido',
      description: r.get('description'),
      university: r.get('university'),
      fechaSolicitud: r.get('fechaSolicitud')
    }));
    res.status(200).json({ success: true, solicitudes });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo solicitudes', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
