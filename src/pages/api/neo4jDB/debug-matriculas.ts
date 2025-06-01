import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { userId } = req.query;
  const driver = connectNeo4j();
  const session = driver.session();

  try {
    // Verificar que el usuario existe
    const userResult = await session.run(
      'MATCH (u:Usuario {_id: $userId}) RETURN u',
      { userId }
    );
    
    // Obtener todos los usuarios
    const allUsersResult = await session.run(
      'MATCH (u:Usuario) RETURN u._id as userId, u.nombreUsuario as nombre LIMIT 10'
    );
    
    // Obtener todos los cursos
    const allCoursesResult = await session.run(
      'MATCH (c:Curso) RETURN c._id as cursoId, c.nombreCurso as nombre LIMIT 10'
    );
    
    // Obtener todas las relaciones de matrícula
    const allRelationsResult = await session.run(
      'MATCH (u:Usuario)-[:MATRICULADO_EN]->(c:Curso) RETURN u._id as userId, c._id as cursoId, u.nombreUsuario as userName, c.nombreCurso as courseName'
    );
    
    // Obtener relaciones específicas del usuario
    const userRelationsResult = await session.run(
      'MATCH (u:Usuario {_id: $userId})-[:MATRICULADO_EN]->(c:Curso) RETURN u._id as userId, c._id as cursoId, c.nombreCurso as courseName',
      { userId }
    );

    const userExists = userResult.records.length > 0;
    const allUsers = allUsersResult.records.map(r => ({ id: r.get('userId'), name: r.get('nombre') }));
    const allCourses = allCoursesResult.records.map(r => ({ id: r.get('cursoId'), name: r.get('nombre') }));
    const allRelations = allRelationsResult.records.map(r => ({ 
      userId: r.get('userId'), 
      cursoId: r.get('cursoId'),
      userName: r.get('userName'),
      courseName: r.get('courseName')
    }));
    const userRelations = userRelationsResult.records.map(r => ({ 
      userId: r.get('userId'), 
      cursoId: r.get('cursoId'),
      courseName: r.get('courseName')
    }));

    res.status(200).json({
      userId,
      userExists,
      totalUsers: allUsers.length,
      totalCourses: allCourses.length,
      totalRelations: allRelations.length,
      userRelations: userRelations.length,
      data: {
        allUsers,
        allCourses,
        allRelations,
        userRelations
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en debug', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
