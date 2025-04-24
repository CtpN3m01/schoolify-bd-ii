import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// GET: Buscar usuario por username (para enviar solicitud)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { username, userId } = req.query;
  if (!username || !userId) {
    return res.status(400).json({ message: 'Faltan parámetros' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (u:Usuario)
      WHERE toLower(u.nombreUsuario) = toLower($username) AND u._id <> $userId
      RETURN u._id AS id, u.nombre AS name, u.foto AS avatar, u.estado AS status, u.descripcion AS description, u.universidad AS university
      LIMIT 1
    `, { username, userId });
    if (result.records.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const u = result.records[0];
    res.status(200).json({
      id: u.get('id'),
      name: u.get('name'),
      avatar: u.get('avatar'),
      status: u.get('status') || 'Desconocido',
      description: u.get('description'),
      university: u.get('university')
    });
  } catch (error) {
    res.status(500).json({ message: 'Error buscando usuario', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
