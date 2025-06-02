import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { seccionId, cursoId } = req.query;

  if (!seccionId || !cursoId) {
    return res.status(400).json({ error: 'seccionId y cursoId son requeridos' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {    // Verificar que la sección existe y obtener comentarios
    const result = await session.run(`
      MATCH (c:Curso {id: $cursoId})-[:TIENE_SECCION]->(s:SeccionComentarios {seccionId: $seccionId})
      OPTIONAL MATCH (s)-[:TIENE_COMENTARIO]->(com:Comentario)-[:ESCRITO_POR]->(u:Usuario)
      
      WITH s, com, u
      ORDER BY com.epochMillis ASC
      
      RETURN s {
        .seccionId,
        .titulo,
        .fechaCreacion
      } as seccion,
      collect(
        CASE WHEN com IS NOT NULL THEN
          com {
            .id,
            .texto,
            .fecha,
            .epochMillis,
            autor: u.nombreUsuario,
            autorEmail: u.email,
            autorId: u._id
          }
        ELSE null END
      ) as comentarios
    `, {
      seccionId: seccionId as string,
      cursoId: cursoId as string
    });

    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Sección de comentarios no encontrada' 
      });
    }

    const record = result.records[0];
    const seccion = record.get('seccion');
    const comentarios = record.get('comentarios').filter((c: any) => c !== null);

    res.status(200).json({ 
      seccion,
      comentarios 
    });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
