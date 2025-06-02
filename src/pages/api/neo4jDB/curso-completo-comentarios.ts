import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { cursoId, usuarioId } = req.query;

  if (!cursoId || !usuarioId) {
    return res.status(400).json({ error: 'cursoId y usuarioId son requeridos' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {    // Verificar permisos del usuario (matriculado o docente)
    console.log('Verificando permisos para:', { usuarioId, cursoId });
    const verificarPermisos = await session.run(`
      MATCH (u:Usuario {_id: $usuarioId})
      MATCH (c:Curso)
      WHERE c.id = $cursoId OR c._id = $cursoId
      OPTIONAL MATCH (u)-[:MATRICULADO_EN]->(c)
      OPTIONAL MATCH (u)-[:ES_DOCENTE_DE]->(c)
      WITH u, c,
           CASE 
             WHEN (u)-[:MATRICULADO_EN]->(c) THEN 'estudiante'
             WHEN (u)-[:ES_DOCENTE_DE]->(c) THEN 'docente'
             ELSE 'sin_acceso'
           END as rol
      RETURN u, c, rol
      ORDER BY CASE WHEN rol <> 'sin_acceso' THEN 0 ELSE 1 END
      LIMIT 1
    `, {
      usuarioId,
      cursoId
    });

    console.log('Resultados de verificación:', verificarPermisos.records.length);
    if (verificarPermisos.records.length > 0) {
      const rol = verificarPermisos.records[0].get('rol');
      console.log('Rol del usuario:', rol);
    }

    if (verificarPermisos.records.length === 0) {
      return res.status(404).json({ error: 'Usuario o curso no encontrado' });
    }

    const rol = verificarPermisos.records[0].get('rol');
    if (rol === 'sin_acceso') {
      return res.status(403).json({ 
        error: 'No tienes acceso a este curso' 
      });
    }    // Obtener información del curso desde MongoDB
    const mongoClient = await connectMongoDB();
    const db = mongoClient.db('ProyectoIBasesII');
    const cursosCollection = db.collection('Cursos');
    
    // Try different formats for the course ID
    const { ObjectId } = require('mongodb');
    let cursoMongo = null;
    
    // First try with the exact cursoId as string
    cursoMongo = await cursosCollection.findOne({ 
      $or: [
        { id: cursoId }, 
        { _id: cursoId },
        { _id: new ObjectId(cursoId) }
      ]
    });
    
    // If not found, try with just the ObjectId
    if (!cursoMongo && ObjectId.isValid(cursoId)) {
      cursoMongo = await cursosCollection.findOne({ _id: new ObjectId(cursoId) });
    }
    
    console.log('MongoDB search result:', cursoMongo ? 'Found' : 'Not found');
    
    if (!cursoMongo) {
      await mongoClient.close();
      return res.status(404).json({ error: 'Curso no encontrado en MongoDB' });
    }
    
    // Close MongoDB connection before proceeding with Neo4j
    await mongoClient.close();// Obtener todas las secciones de comentarios del curso desde Neo4j
    const seccionesResult = await session.run(`
      MATCH (c:Curso)
      WHERE c.id = $cursoId OR c._id = $cursoId
      MATCH (c)-[:TIENE_SECCION]->(s:SeccionComentarios)
      OPTIONAL MATCH (s)-[:CREADA_POR]->(u:Usuario)
      OPTIONAL MATCH (s)-[:TIENE_COMENTARIO]->(com:Comentario)
      
      WITH s, u.nombreUsuario as creador, count(com) as totalComentarios
      RETURN s.seccionId as seccionId,
             s.titulo as titulo,
             s.fechaCreacion as fechaCreacion,
             s.creadoPor as creadoPor,
             creador,
             totalComentarios
      ORDER BY s.fechaCreacion DESC
    `, {
      cursoId
    });

    const secciones = seccionesResult.records.map(record => ({
      seccionId: record.get('seccionId'),
      titulo: record.get('titulo'),
      fechaCreacion: record.get('fechaCreacion'),
      creadoPor: record.get('creadoPor'),
      creador: record.get('creador'),
      totalComentarios: record.get('totalComentarios').toNumber()
    }));    // Para cada sección, obtener sus comentarios recientes (últimos 5)
    const seccionesConComentarios = await Promise.all(
      secciones.map(async (seccion) => {
        // Create a new session for each comment query
        const commentSession = driver.session();
        try {
          const comentariosResult = await commentSession.run(`
            MATCH (c:Curso)
            WHERE c.id = $cursoId OR c._id = $cursoId
            MATCH (c)-[:TIENE_SECCION]->(s:SeccionComentarios {seccionId: $seccionId})
            MATCH (s)-[:TIENE_COMENTARIO]->(com:Comentario)-[:ESCRITO_POR]->(u:Usuario)
            
            RETURN com {
              .id,
              .texto,
              .fecha,
              .epochMillis,
              autor: u.nombreUsuario,
              autorEmail: u.email,
              autorId: u._id
            } as comentario
            ORDER BY com.epochMillis DESC
            LIMIT 5
          `, {
            cursoId,
            seccionId: seccion.seccionId
          });

          const comentariosRecientes = comentariosResult.records.map(r => r.get('comentario'));

          return {
            ...seccion,
            comentariosRecientes
          };
        } finally {
          await commentSession.close();
        }
      })
    );    // Obtener estadísticas del curso
    const statsSession = driver.session();
    let estadisticas;
    try {
      const estadisticasResult = await statsSession.run(`
        MATCH (c:Curso)
        WHERE c.id = $cursoId OR c._id = $cursoId
        OPTIONAL MATCH (c)<-[:MATRICULADO_EN]-(estudiante:Usuario)
        OPTIONAL MATCH (c)<-[:ES_DOCENTE_DE]-(docente:Usuario)
        OPTIONAL MATCH (c)-[:TIENE_SECCION]->(s:SeccionComentarios)-[:TIENE_COMENTARIO]->(com:Comentario)
        
        RETURN count(DISTINCT estudiante) as totalEstudiantes,
               count(DISTINCT docente) as totalDocentes,
               count(DISTINCT s) as totalSeccionesComentarios,
               count(com) as totalComentarios
      `, {
        cursoId
      });

      estadisticas = estadisticasResult.records[0];
    } finally {
      await statsSession.close();
    }

    res.status(200).json({
      curso: {
        ...cursoMongo,
        rol: rol,
        estadisticas: {
          totalEstudiantes: estadisticas.get('totalEstudiantes').toNumber(),
          totalDocentes: estadisticas.get('totalDocentes').toNumber(),
          totalSeccionesComentarios: estadisticas.get('totalSeccionesComentarios').toNumber(),
          totalComentarios: estadisticas.get('totalComentarios').toNumber()
        }
      },
      seccionesComentarios: seccionesConComentarios
    });

  } catch (error) {
    console.error('Error al obtener información del curso:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
