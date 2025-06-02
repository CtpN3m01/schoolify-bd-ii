import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { seccionId, cursoId, usuarioId, texto } = req.body;

  if (!seccionId || !cursoId || !usuarioId || !texto) {
    return res.status(400).json({ 
      error: 'seccionId, cursoId, usuarioId y texto son requeridos' 
    });
  }

  const driver = connectNeo4j();
  const session = driver.session();
  try {
    console.log('=== DEBUGGING AGREGAR COMENTARIO API ===');
    console.log('Datos recibidos:', { seccionId, cursoId, usuarioId, texto });    // Verificar que el usuario existe y matricularlo automáticamente si no está matriculado
    const verificarYMatricular = await session.run(`
      MATCH (u:Usuario {_id: $usuarioId})
      MATCH (c:Curso {id: $cursoId})
      
      // Verificar si ya está matriculado o es docente
      OPTIONAL MATCH (u)-[:MATRICULADO_EN]->(c)
      OPTIONAL MATCH (u)-[:ES_DOCENTE_DE]->(c)
      
      // Si no está matriculado y no es docente, matricularlo automáticamente
      FOREACH (_ IN CASE 
        WHEN NOT (u)-[:MATRICULADO_EN]->(c) AND NOT (u)-[:ES_DOCENTE_DE]->(c) 
        THEN [1] 
        ELSE [] 
      END |
        CREATE (u)-[:MATRICULADO_EN {fechaMatricula: datetime()}]->(c)
      )
      
      RETURN u, c, true as tienePermiso
    `, {
      usuarioId,
      cursoId
    });

    console.log('Registros encontrados en verificación:', verificarYMatricular.records.length);
    
    if (verificarYMatricular.records.length === 0) {
      console.log('ERROR: Usuario o curso no encontrado');
      return res.status(404).json({ error: 'Usuario o curso no encontrado' });
    }

    const record = verificarYMatricular.records[0];
    const usuario = record.get('u');
    const curso = record.get('c');
    
    console.log('Usuario encontrado:', usuario ? usuario.properties : 'No encontrado');
    console.log('Curso encontrado:', curso ? curso.properties : 'No encontrado');
    console.log('Usuario matriculado automáticamente para comentarios');

    // Crear o encontrar la sección de comentarios y agregar el comentario
    const resultado = await session.run(`
      MATCH (c:Curso {id: $cursoId})
      MATCH (u:Usuario {_id: $usuarioId})
      
      // Crear o encontrar la sección de comentarios
      MERGE (c)-[:TIENE_SECCION]->(s:SeccionComentarios {seccionId: $seccionId})
      
      // Crear el comentario
      CREATE (s)-[:TIENE_COMENTARIO]->(com:Comentario {
        id: randomUUID(),
        texto: $texto,
        fecha: datetime(),
        epochMillis: datetime().epochMillis
      })
      
      // Conectar el comentario con el usuario
      CREATE (com)-[:ESCRITO_POR]->(u)
      
      RETURN com {
        .id,
        .texto,
        .fecha,
        .epochMillis,
        autor: u.nombreUsuario,
        autorEmail: u.email,
        autorId: u._id
      } as comentario
    `, {
      seccionId,
      cursoId,
      usuarioId,
      texto
    });

    if (resultado.records.length === 0) {
      return res.status(500).json({ error: 'No se pudo crear el comentario' });
    }

    const comentario = resultado.records[0].get('comentario');
    
    res.status(201).json({ 
      success: true, 
      comentario 
    });

  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
