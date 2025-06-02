import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// GET: Sugerencias de amigos para un usuario
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
      MATCH (yo:Usuario {_id: $userId})
      // Amigos de amigos
      OPTIONAL MATCH (yo)-[:AMIGO]->(:Usuario)-[:AMIGO]->(sugerido:Usuario)
      WHERE NOT (yo)-[:AMIGO]-(sugerido) AND sugerido._id <> $userId
      // Usuarios en los mismos cursos
      OPTIONAL MATCH (yo)-[:MATRICULADO_EN]->(c:Curso)<-[:MATRICULADO_EN]-(sugerido2:Usuario)
      WHERE sugerido2._id <> $userId AND NOT (yo)-[:AMIGO]-(sugerido2)
      WITH collect(DISTINCT sugerido) + collect(DISTINCT sugerido2) AS sugeridos, yo
      UNWIND sugeridos AS s
      WITH DISTINCT s, yo
      WHERE s IS NOT NULL AND NOT (yo)-[:SOLICITUD_AMISTAD]->(s) AND NOT (s)-[:SOLICITUD_AMISTAD]->(yo)      // Calcular amigos en común
      OPTIONAL MATCH (yo)-[:AMIGO]->(amigoComun:Usuario)<-[:AMIGO]-(s)
      WITH s, count(DISTINCT amigoComun) AS mutualFriends
      RETURN s._id AS id, 
             trim(COALESCE(s.nombre, '') + ' ' + COALESCE(s.apellido1, '') + ' ' + COALESCE(s.apellido2, '')) AS name, 
             s.foto AS avatar, mutualFriends
      LIMIT 20
    `, { userId });
    const sugerencias = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      avatar: r.get('avatar'),
      mutualFriends: r.get('mutualFriends')
    }));
    res.status(200).json({ success: true, sugerencias });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo sugerencias', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
