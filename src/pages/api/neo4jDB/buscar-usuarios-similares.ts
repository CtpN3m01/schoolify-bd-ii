import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// GET: Buscar usuarios similares por nombre o username (búsqueda con porcentaje)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { query, userId, limit = '5' } = req.query;

  if (!query || !userId) {
    return res.status(400).json({ message: 'Faltan parámetros' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    // Buscar usuarios por similitud en nombre completo y username
    const result = await session.run(`
      MATCH (u:Usuario)
      WHERE u._id <> $userId
        AND (
          toLower(u.nombreUsuario) CONTAINS toLower($query) OR
          toLower(trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, ''))) CONTAINS toLower($query) OR
          toLower(u.nombre) CONTAINS toLower($query) OR
          toLower(u.apellido1) CONTAINS toLower($query) OR
          toLower(u.apellido2) CONTAINS toLower($query)
        )
      WITH u,
        CASE 
          WHEN toLower(u.nombreUsuario) = toLower($query) THEN 100
          WHEN toLower(u.nombreUsuario) STARTS WITH toLower($query) THEN 90
          WHEN toLower(u.nombreUsuario) CONTAINS toLower($query) THEN 70
          WHEN toLower(trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, ''))) = toLower($query) THEN 95
          WHEN toLower(trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, ''))) STARTS WITH toLower($query) THEN 85
          WHEN toLower(trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, ''))) CONTAINS toLower($query) THEN 60
          WHEN toLower(u.nombre) STARTS WITH toLower($query) THEN 75
          WHEN toLower(u.apellido1) STARTS WITH toLower($query) THEN 75
          WHEN toLower(u.apellido2) STARTS WITH toLower($query) THEN 75
          WHEN toLower(u.nombre) CONTAINS toLower($query) THEN 50
          WHEN toLower(u.apellido1) CONTAINS toLower($query) THEN 50
          WHEN toLower(u.apellido2) CONTAINS toLower($query) THEN 50
          ELSE 30
        END AS similarity
      WHERE similarity >= 50
      RETURN u._id AS _id, 
             trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, '')) AS nombre,
             u.nombreUsuario AS nombreUsuario, 
             u.foto AS foto, 
             u.estado AS estado, 
             u.descripcion AS descripcion, 
             u.universidad AS universidad,
             similarity
      ORDER BY similarity DESC, toLower(u.nombre) ASC
      LIMIT toInteger($limit)
    `, { 
      query: query.toString(), 
      userId: userId.toString(), 
      limit: limit.toString() 
    });

    const usuarios = result.records.map(record => ({
      _id: record.get('_id'),
      nombre: record.get('nombre'),
      nombreUsuario: record.get('nombreUsuario'),
      foto: record.get('foto'),
      estado: record.get('estado') || 'Activo',
      descripcion: record.get('descripcion'),
      universidad: record.get('universidad'),
      similarity: record.get('similarity')
    }));

    res.status(200).json({
      usuarios,
      totalEncontrados: usuarios.length
    });

  } catch (error) {
    console.error('Error buscando usuarios similares:', error);
    res.status(500).json({ 
      message: 'Error buscando usuarios similares', 
      error: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
