import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { cursoId } = req.query;

  if (!cursoId) {
    return res.status(400).json({ error: 'cursoId es requerido' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {    // Consultar estudiantes matriculados en el curso
    const result = await session.run(
      `
      MATCH (u:Usuario)-[:MATRICULADO_EN]->(c:Curso {_id: $cursoId})
      RETURN u.nombreUsuario as nombreUsuario, 
             u.email as email, 
             u._id as id,
             u.nombre as nombre,
             u.apellido1 as apellido1,
             u.apellido2 as apellido2,
             u.foto as foto,
             trim(COALESCE(u.nombre, '') + ' ' + COALESCE(u.apellido1, '') + ' ' + COALESCE(u.apellido2, '')) as nombreCompleto
      ORDER BY u.nombreUsuario
      `,
      { cursoId: cursoId as string }
    );

    const estudiantes = result.records.map((record: any) => ({
      id: record.get('id'),
      nombreUsuario: record.get('nombreUsuario'),
      email: record.get('email'),
      nombre: record.get('nombre'),
      apellido1: record.get('apellido1'),
      apellido2: record.get('apellido2'),
      foto: record.get('foto'),
      nombreCompleto: record.get('nombreCompleto')
    }));

    res.status(200).json({
      success: true,
      estudiantes
    });

  } catch (error) {
    console.error('Error al obtener estudiantes matriculados:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    await session.close();
  }
}
