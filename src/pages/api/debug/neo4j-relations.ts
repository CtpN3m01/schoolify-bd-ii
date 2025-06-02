import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from '../neo4jDB/connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId, cursoId } = req.query;

  if (!userId || !cursoId) {
    return res.status(400).json({ error: 'userId y cursoId son requeridos' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    // Check what exists in the database
    const checkUser = await session.run(`
      MATCH (u:Usuario {_id: $userId})
      RETURN u.nombreUsuario as username, u._id as userId
    `, { userId });

    const checkCourse = await session.run(`
      MATCH (c:Curso)
      WHERE c.id = $cursoId OR c._id = $cursoId
      RETURN c.nombreCurso as courseName, c.id as courseId, c._id as courseMongoId
    `, { cursoId });

    const checkRelationships = await session.run(`
      MATCH (u:Usuario {_id: $userId})
      MATCH (c:Curso)
      WHERE c.id = $cursoId OR c._id = $cursoId
      OPTIONAL MATCH (u)-[r1:MATRICULADO_EN]->(c)
      OPTIONAL MATCH (u)-[r2:ES_DOCENTE_DE]->(c)
      RETURN u.nombreUsuario as username, 
             c.nombreCurso as courseName,
             r1 is not null as isEnrolled,
             r2 is not null as isTeacher
    `, { userId, cursoId });    const result = {
      user: checkUser.records.map(r => r.toObject()),
      course: checkCourse.records.map(r => r.toObject()),
      relationships: checkRelationships.records.map(r => r.toObject())
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: 'Error en debug', details: (error as Error).message });
  } finally {
    await session.close();
  }
}
