import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

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

    // Primero verificar/crear el curso en Neo4j si no existe
    const verificarCurso = await session.run(`
      MATCH (c:Curso {id: $cursoId})
      RETURN c
    `, { cursoId: cursoId as string });

    if (verificarCurso.records.length === 0) {
      console.log('Curso no encontrado en Neo4j, creándolo desde MongoDB...');
      
      // Obtener datos del curso desde MongoDB
      try {
        const mongoClient = await connectMongoDB();
        const db = mongoClient.db('ProyectoIBasesII');        const cursosCollection = db.collection('Cursos');
        const { ObjectId } = require('mongodb');
        
        console.log('Comentarios-seccion: Buscando curso con ID:', cursoId, 'tipo:', typeof cursoId);
        
        if (!ObjectId.isValid(cursoId)) {
          console.log('ID de curso no válido para ObjectId:', cursoId);
          return res.status(400).json({ 
            error: 'ID de curso no válido.' 
          });
        }
        
        // Debug: Verificar qué cursos existen en la base de datos
        const allCursos = await cursosCollection.find({}).limit(5).toArray();
        console.log('Comentarios-seccion: Primeros 5 cursos en MongoDB:', allCursos.map((c: any) => ({ _id: c._id.toString(), nombre: c.nombreCurso })));
        
        const objectId = new ObjectId(cursoId);
        console.log('Comentarios-seccion: ObjectId creado:', objectId.toString());
        
        const cursoData = await cursosCollection.findOne({ _id: objectId });
        
        console.log('Comentarios-seccion: Resultado de búsqueda en MongoDB:', cursoData ? 'Curso encontrado' : 'Curso no encontrado');
        
        if (cursoData) {
          console.log('Comentarios-seccion: Curso encontrado:', { _id: cursoData._id.toString(), nombre: cursoData.nombreCurso });
        }
        
        if (!cursoData) {
          return res.status(404).json({ 
            error: 'Curso no encontrado en MongoDB.' 
          });
        }

        // Crear el curso en Neo4j
        const nombreCurso = cursoData.nombreCurso || 'Sin nombre';
        const estado = cursoData.estado || 'Activo';
        const fechaInicio = cursoData.fechaInicio ? new Date(cursoData.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const fechaFin = cursoData.fechaFin ? new Date(cursoData.fechaFin).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const descripcion = cursoData.descripcion || 'Sin descripción';
        const nombreUsuarioDocente = cursoData.nombreUsuarioDocente || '';

        await session.run(`
          CREATE (c:Curso {
            id: $cursoId,
            fechaCreacion: datetime(), 
            nombreCurso: $nombreCurso, 
            estado: $estado,
            fechaInicio: date($fechaInicio),
            fechaFin: date($fechaFin),
            descripcion: $descripcion,
            nombreUsuarioDocente: $nombreUsuarioDocente
          })
        `, {
          cursoId: cursoId as string,
          nombreCurso,
          estado,
          fechaInicio,
          fechaFin,
          descripcion,
          nombreUsuarioDocente
        });

        console.log('Curso creado en Neo4j desde MongoDB');
        
      } catch (mongoError) {
        console.log('Error obteniendo el curso desde MongoDB:', mongoError);
        return res.status(500).json({ 
          error: 'Error al acceder a los datos del curso.' 
        });
      }
    }

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
    const comentarios = record.get('comentarios').filter((c: any) => c !== null);    // Procesar comentarios para manejar fechas correctamente
    const comentariosProcesados = comentarios.map((comentario: any) => {
      // Manejar diferentes formatos de fecha de Neo4j
      let fechaCompleta = null;
      let fechaFormateada = 'Sin fecha';
      let horaFormateada = 'Sin hora';
      
      try {
        if (comentario.fecha) {
          // Si la fecha viene como objeto Neo4j DateTime
          if (typeof comentario.fecha === 'object' && comentario.fecha.toString) {
            fechaCompleta = new Date(comentario.fecha.toString());
          } 
          // Si la fecha viene como string ISO
          else if (typeof comentario.fecha === 'string') {
            fechaCompleta = new Date(comentario.fecha);
          }
        }
        
        // Usar epochMillis como fallback si la fecha no es válida
        if (!fechaCompleta || isNaN(fechaCompleta.getTime())) {
          if (comentario.epochMillis) {
            fechaCompleta = new Date(comentario.epochMillis);
          }
        }
        
        // Formatear la fecha si es válida
        if (fechaCompleta && !isNaN(fechaCompleta.getTime())) {
          fechaFormateada = fechaCompleta.toLocaleDateString('es-ES');
          horaFormateada = fechaCompleta.toLocaleTimeString('es-ES');
        }
      } catch (e) {
        console.error('Error procesando fecha:', e);
        fechaFormateada = 'Fecha inválida';
        horaFormateada = 'Hora inválida';
      }

      return {
        ...comentario,
        fechaOriginal: comentario.fecha, // Guardar la fecha original para debug
        fecha: fechaCompleta ? fechaCompleta.toISOString() : null, // Fecha ISO válida para el frontend
        fechaFormateada,
        horaFormateada
      };
    });

    console.log('Comentarios procesados antes de deduplicación:', comentariosProcesados.length);

    // DEDUPLICACIÓN: Eliminar comentarios duplicados basándose en autor, texto y timestamp
    const comentariosUnicos = comentariosProcesados.reduce((acc: any[], comentario: any) => {
      // Crear una clave única basada en autor, texto y timestamp
      const autorKey = comentario.autorId || comentario.autor || 'unknown';
      const texto = (comentario.texto || '').trim();
      const timestamp = comentario.epochMillis || comentario.fecha || Date.now();
      const clave = `${autorKey}-${texto}-${timestamp}`;
      
      // Verificar si ya existe un comentario con esta clave
      const existe = acc.some(c => {
        const existeAutorKey = c.autorId || c.autor || 'unknown';
        const existeTexto = (c.texto || '').trim();
        const existeTimestamp = c.epochMillis || c.fecha || Date.now();
        const existeClave = `${existeAutorKey}-${existeTexto}-${existeTimestamp}`;
        return existeClave === clave;
      });
      
      if (!existe) {
        acc.push(comentario);
      } else {
        console.log('Comentario duplicado eliminado:', { autor: comentario.autor, texto: comentario.texto.substring(0, 50) });
      }
      
      return acc;
    }, []);

    console.log('Comentarios después de deduplicación:', comentariosUnicos.length);
    console.log('Comentarios únicos finales:', comentariosUnicos);

    res.status(200).json({ 
      seccion,
      comentarios: comentariosUnicos
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
