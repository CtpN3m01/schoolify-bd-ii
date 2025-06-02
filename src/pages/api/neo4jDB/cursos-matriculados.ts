import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// GET: Cursos en los que un usuario está matriculado
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Falta userId' });
  }
  const driver = connectNeo4j();
  const session = driver.session();  try {    const result = await session.run(
      `MATCH (u:Usuario {_id: $userId})-[:MATRICULADO_EN]->(c:Curso)
       RETURN coalesce(c._id, c.id) AS _id, c.nombreCurso AS nombreCurso, c.descripcion AS descripcion, c.foto AS foto, c.fechaInicio AS fechaInicio, c.fechaFin AS fechaFin, c.estado AS estado, c.nombreUsuarioDocente AS nombreUsuarioDocente`,
      { userId }
    );
    
    const cursos = result.records.map(r => ({
      _id: r.get('_id'),
      nombreCurso: r.get('nombreCurso'),
      descripcion: r.get('descripcion'),
      foto: r.get('foto'),
      fechaInicio: r.get('fechaInicio'),
      fechaFin: r.get('fechaFin'),
      estado: r.get('estado'),
      nombreUsuarioDocente: r.get('nombreUsuarioDocente'),
    }));
    
    res.status(200).json({ cursos });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo cursos matriculados', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
