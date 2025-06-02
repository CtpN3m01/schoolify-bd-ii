import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const driver = connectNeo4j();
  const session = driver.session();

  try {    if (req.method === 'POST') {
      // Crear nueva sección de comentarios
      const { seccionId, cursoId, titulo, docenteId } = req.body;

      if (!seccionId || !cursoId || !titulo || !docenteId) {
        return res.status(400).json({          error: 'seccionId, cursoId, titulo y docenteId son requeridos' 
        });
      }

      // Primero verificar/crear el usuario en Neo4j si no existe
      await session.run(`
        MERGE (u:Usuario {nombreUsuario: $docenteId})
        ON CREATE SET u._id = $docenteId, u.fechaCreacion = datetime(), u.rol = 'docente'
      `, { docenteId });      // Obtener datos del curso desde MongoDB
      let cursoData = null;
      
      try {
        const mongoClient = await connectMongoDB();
        const db = mongoClient.db('schoolify');
        const cursosCollection = db.collection('Cursos');
        const { ObjectId } = require('mongodb');
        
        cursoData = await cursosCollection.findOne({ _id: new ObjectId(cursoId) });
        
        if (!cursoData) {
          return res.status(404).json({ 
            error: 'Curso no encontrado en MongoDB. No se puede crear sección de comentarios.' 
          });
        }
      } catch (mongoError) {
        console.log('Error obteniendo el curso desde MongoDB:', mongoError);
        return res.status(500).json({ 
          error: 'Error al acceder a los datos del curso. No se puede crear sección de comentarios.' 
        });
      }

      // Usar datos del curso obtenidos de MongoDB
      const nombreCurso = cursoData.nombreCurso || 'Sin nombre';
      const estado = cursoData.estado || 'Activo';
      const fechaInicio = cursoData.fechaInicio ? new Date(cursoData.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const fechaFin = cursoData.fechaFin ? new Date(cursoData.fechaFin).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const descripcion = cursoData.descripcion || 'Sin descripción';
      const nombreUsuarioDocente = cursoData.nombreUsuarioDocente || '';// Verificar/crear el curso en Neo4j si no existe
      await session.run(`
        MERGE (c:Curso {id: $cursoId})
        ON CREATE SET 
          c.fechaCreacion = datetime(), 
          c.nombreCurso = $nombreCurso, 
          c.estado = $estado,
          c.fechaInicio = date($fechaInicio),
          c.fechaFin = date($fechaFin),
          c.descripcion = $descripcion,
          c.nombreUsuarioDocente = $nombreUsuarioDocente
        ON MATCH SET 
          c.nombreCurso = $nombreCurso, 
          c.estado = $estado,
          c.fechaInicio = date($fechaInicio),
          c.fechaFin = date($fechaFin),
          c.descripcion = $descripcion,
          c.nombreUsuarioDocente = $nombreUsuarioDocente
      `, { cursoId, nombreCurso, estado, fechaInicio, fechaFin, descripcion, nombreUsuarioDocente });

      // Verificar que el usuario es docente del curso - buscar por _id o nombreUsuario
      const verificarDocente = await session.run(`
        MATCH (c:Curso {id: $cursoId})
        OPTIONAL MATCH (u:Usuario)
        WHERE u._id = $docenteId OR u.nombreUsuario = $docenteId
        OPTIONAL MATCH (u)-[:ES_DOCENTE_DE]->(c)
        RETURN u, c, 
               CASE WHEN (u)-[:ES_DOCENTE_DE]->(c) THEN true ELSE false END as esDocente,
               u.nombreUsuario as nombreUsuario
      `, {
        docenteId,
        cursoId
      });      if (verificarDocente.records.length === 0) {
        return res.status(404).json({ error: 'Usuario o curso no encontrado' });
      }

      const esDocente = verificarDocente.records[0].get('esDocente');
      
      // Si no es docente, crear la relación ES_DOCENTE_DE (asumiendo que quien crea el curso es docente)
      if (!esDocente) {
        await session.run(`
          MATCH (u:Usuario)
          WHERE u._id = $docenteId OR u.nombreUsuario = $docenteId
          MATCH (c:Curso {id: $cursoId})
          MERGE (u)-[:ES_DOCENTE_DE]->(c)
        `, { docenteId, cursoId });
      }// Crear la sección de comentarios
      const resultado = await session.run(`
        MATCH (c:Curso {id: $cursoId})
        MATCH (u:Usuario)
        WHERE u._id = $docenteId OR u.nombreUsuario = $docenteId
        
        CREATE (c)-[:TIENE_SECCION]->(s:SeccionComentarios {
          seccionId: $seccionId,
          titulo: $titulo,
          fechaCreacion: datetime(),
          creadoPor: $docenteId
        })
        
        CREATE (s)-[:CREADA_POR]->(u)
        
        RETURN s {
          .seccionId,
          .titulo,
          .fechaCreacion,
          .creadoPor,
          creador: u.nombreUsuario
        } as seccion
      `, {
        seccionId,
        cursoId,
        titulo,
        docenteId
      });

      const seccion = resultado.records[0].get('seccion');
      
      return res.status(201).json({ 
        success: true, 
        seccion 
      });

    } else if (req.method === 'DELETE') {
      // Eliminar sección de comentarios
      const { seccionId, cursoId, docenteId } = req.body;

      if (!seccionId || !cursoId || !docenteId) {
        return res.status(400).json({ 
          error: 'seccionId, cursoId y docenteId son requeridos' 
        });
      }      // Verificar que el usuario es docente del curso
      const verificarDocente = await session.run(`
        MATCH (c:Curso {id: $cursoId})
        OPTIONAL MATCH (u:Usuario)
        WHERE u._id = $docenteId OR u.nombreUsuario = $docenteId
        OPTIONAL MATCH (u)-[:ES_DOCENTE_DE]->(c)
        RETURN CASE WHEN (u)-[:ES_DOCENTE_DE]->(c) THEN true ELSE false END as esDocente
      `, {
        docenteId,
        cursoId
      });

      if (verificarDocente.records.length === 0) {
        return res.status(404).json({ error: 'Usuario o curso no encontrado' });
      }

      const esDocente = verificarDocente.records[0].get('esDocente');
      if (!esDocente) {
        return res.status(403).json({ 
          error: 'Solo el docente puede eliminar secciones de comentarios' 
        });
      }

      // Eliminar la sección y todos sus comentarios
      const resultado = await session.run(`
        MATCH (c:Curso {id: $cursoId})-[:TIENE_SECCION]->(s:SeccionComentarios {seccionId: $seccionId})
        OPTIONAL MATCH (s)-[:TIENE_COMENTARIO]->(com:Comentario)
        DETACH DELETE s, com
        RETURN count(s) as seccionesEliminadas, count(com) as comentariosEliminados
      `, {
        seccionId,
        cursoId
      });

      const stats = resultado.records[0];
      
      return res.status(200).json({ 
        success: true,
        message: 'Sección de comentarios eliminada',
        seccionesEliminadas: stats.get('seccionesEliminadas').toNumber(),
        comentariosEliminados: stats.get('comentariosEliminados').toNumber()
      });

    } else if (req.method === 'GET') {
      // Listar todas las secciones de comentarios de un curso
      const { cursoId } = req.query;

      if (!cursoId) {
        return res.status(400).json({ error: 'cursoId es requerido' });
      }

      const resultado = await session.run(`
        MATCH (c:Curso {id: $cursoId})-[:TIENE_SECCION]->(s:SeccionComentarios)
        OPTIONAL MATCH (s)-[:CREADA_POR]->(u:Usuario)
        OPTIONAL MATCH (s)-[:TIENE_COMENTARIO]->(com:Comentario)
        
        RETURN s {
          .seccionId,
          .titulo,
          .fechaCreacion,
          .creadoPor,
          creador: u.nombreUsuario,
          totalComentarios: count(com)
        } as seccion
        ORDER BY s.fechaCreacion DESC
      `, {
        cursoId: cursoId as string
      });

      const secciones = resultado.records.map(record => record.get('seccion'));
      
      return res.status(200).json({ secciones });

    } else {
      return res.status(405).json({ error: 'Método no permitido' });
    }

  } catch (error) {
    console.error('Error en gestionar-secciones-comentarios:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
