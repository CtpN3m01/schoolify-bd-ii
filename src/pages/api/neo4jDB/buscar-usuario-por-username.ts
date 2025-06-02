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
  const session = driver.session();  try {    const result = await session.run(`
      MATCH (u:Usuario)
      WHERE toLower(u.nombreUsuario) = toLower($username) AND u._id <> $userId
      RETURN u._id AS _id, 
             trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, '')) AS nombre,
             u.nombreUsuario AS nombreUsuario, u.foto AS foto, u.estado AS estado, 
             u.descripcion AS descripcion, u.universidad AS universidad, u.fechaNacimiento AS fechaNacimiento
      LIMIT 1
    `, { username, userId });
    if (result.records.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }    const u = result.records[0];
    res.status(200).json({
      _id: u.get('_id'),
      nombre: u.get('nombre'),
      nombreUsuario: u.get('nombreUsuario'),
      foto: u.get('foto'),
      estado: u.get('estado') || 'Activo',
      descripcion: u.get('descripcion'),
      universidad: u.get('universidad'),
      fechaNacimiento: u.get('fechaNacimiento')
    });
  }catch (error) {
    res.status(500).json({ message: 'Error buscando usuario', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
