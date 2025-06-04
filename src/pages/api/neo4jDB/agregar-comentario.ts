import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

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
    console.log('Datos recibidos:', { seccionId, cursoId, usuarioId, texto });

    // Primero verificar/crear el curso en Neo4j si no existe
    const verificarCurso = await session.run(`
      MATCH (c:Curso {id: $cursoId})
      RETURN c
    `, { cursoId });

    if (verificarCurso.records.length === 0) {
      console.log('Curso no encontrado en Neo4j, creándolo desde MongoDB...');
      
      // Obtener datos del curso desde MongoDB
      try {
        const mongoClient = await connectMongoDB();
        const db = mongoClient.db('ProyectoIBasesII');        const cursosCollection = db.collection('Cursos');
        const { ObjectId } = require('mongodb');
        
        console.log('Agregar-comentario: Buscando curso con ID:', cursoId, 'tipo:', typeof cursoId);
        
        if (!ObjectId.isValid(cursoId)) {
          console.log('ID de curso no válido para ObjectId:', cursoId);
          return res.status(400).json({ 
            error: 'ID de curso no válido.' 
          });
        }
        
        // Debug: Verificar qué cursos existen en la base de datos
        const allCursos = await cursosCollection.find({}).limit(5).toArray();
        console.log('Agregar-comentario: Primeros 5 cursos en MongoDB:', allCursos.map((c: any) => ({ _id: c._id.toString(), nombre: c.nombreCurso })));
        
        const objectId = new ObjectId(cursoId);
        console.log('Agregar-comentario: ObjectId creado:', objectId.toString());
        
        const cursoData = await cursosCollection.findOne({ _id: objectId });
        
        console.log('Agregar-comentario: Resultado de búsqueda en MongoDB:', cursoData ? 'Curso encontrado' : 'Curso no encontrado');
        
        if (cursoData) {
          console.log('Agregar-comentario: Curso encontrado:', { _id: cursoData._id.toString(), nombre: cursoData.nombreCurso });
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
          cursoId,
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

    // Verificar que el usuario existe y matricularlo automáticamente si no está matriculado
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
    });    if (resultado.records.length === 0) {
      return res.status(500).json({ error: 'No se pudo crear el comentario' });
    }

    const comentario = resultado.records[0].get('comentario');
    
    // Procesar la fecha del comentario creado para enviar formato correcto al frontend
    let fechaFormateada = 'Sin fecha';
    let horaFormateada = 'Sin hora';
    let fechaCompleta = null;
    
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
      console.error('Error procesando fecha del comentario creado:', e);
      fechaFormateada = 'Fecha inválida';
      horaFormateada = 'Hora inválida';
    }

    const comentarioProcesado = {
      ...comentario,
      fechaOriginal: comentario.fecha, // Guardar la fecha original para debug
      fecha: fechaCompleta ? fechaCompleta.toISOString() : null, // Fecha ISO válida para el frontend
      fechaFormateada,
      horaFormateada
    };
    
    console.log('Comentario procesado enviado al frontend:', comentarioProcesado);
    
    res.status(201).json({ 
      success: true, 
      comentario: comentarioProcesado
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
