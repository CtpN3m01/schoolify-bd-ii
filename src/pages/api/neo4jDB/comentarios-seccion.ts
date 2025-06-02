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
  try {    
    console.log('=== DEBUGGING COMENTARIOS SECCION API ===');
    console.log('Parámetros:', { seccionId, cursoId });

    // Verificar que la sección existe y obtener comentarios
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

    console.log('Registros encontrados:', result.records.length);
    
    if (result.records.length > 0) {
      const record = result.records[0];
      const seccion = record.get('seccion');
      const comentarios = record.get('comentarios');
      
      console.log('Sección:', seccion);
      console.log('Total comentarios encontrados:', comentarios.length);
      console.log('Comentarios raw:', comentarios);
    }    if (result.records.length === 0) {
      console.log('No se encontró la sección de comentarios');
      return res.status(404).json({ 
        error: 'Sección de comentarios no encontrada' 
      });
    }

    const record = result.records[0];
    const seccion = record.get('seccion');
    const comentarios = record.get('comentarios').filter((c: any) => c !== null);

    // Procesar comentarios para manejar fechas correctamente
    const comentariosProcesados = comentarios.map((comentario: any) => {
      // Manejar diferentes formatos de fecha de Neo4j
      let fechaFormateada = 'Sin fecha';
      try {
        if (comentario.fecha) {
          // Si la fecha viene como objeto Neo4j DateTime
          if (typeof comentario.fecha === 'object' && comentario.fecha.toString) {
            fechaFormateada = new Date(comentario.fecha.toString()).toLocaleDateString('es-ES');
          } 
          // Si la fecha viene como string ISO
          else if (typeof comentario.fecha === 'string') {
            fechaFormateada = new Date(comentario.fecha).toLocaleDateString('es-ES');
          }
          // Si la fecha viene como timestamp
          else if (comentario.epochMillis) {
            fechaFormateada = new Date(comentario.epochMillis).toLocaleDateString('es-ES');
          }
        }
      } catch (e) {
        console.error('Error procesando fecha:', e);
        fechaFormateada = 'Fecha inválida';
      }

      return {
        ...comentario,
        fecha: fechaFormateada,
        fechaOriginal: comentario.fecha // Guardar la fecha original para debug
      };
    });

    console.log('Comentarios procesados:', comentariosProcesados);

    res.status(200).json({ 
      seccion,
      comentarios: comentariosProcesados
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
