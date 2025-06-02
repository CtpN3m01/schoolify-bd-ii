import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return obtenerConsultas(req, res);
  } else if (req.method === 'POST') {
    return crearConsulta(req, res);
  } else {
    return res.status(405).json({ error: 'Método no permitido' });
  }
}

// Obtener todas las consultas de un curso
async function obtenerConsultas(req: NextApiRequest, res: NextApiResponse) {
  const { cursoId } = req.query;

  if (!cursoId) {
    return res.status(400).json({ error: 'cursoId es requerido' });
  }

  const driver = connectNeo4j();
  const session = driver.session();
  
  try {
    console.log('=== OBTENIENDO CONSULTAS DEL CURSO ===');
    console.log('Curso ID:', cursoId);

    const result = await session.run(`
      MATCH (c:Curso {id: $cursoId})
      OPTIONAL MATCH (c)-[:TIENE_CONSULTA]->(consulta:Consulta)-[:CREADA_POR]->(estudiante:Usuario)
      OPTIONAL MATCH (consulta)-[:TIENE_RESPUESTA]->(respuesta:RespuestaConsulta)-[:RESPONDIDA_POR]->(docente:Usuario)
      
      WITH consulta, estudiante, respuesta, docente
      ORDER BY consulta.fechaCreacion DESC
      
      RETURN collect(
        CASE WHEN consulta IS NOT NULL THEN
          consulta {
            .id,
            .titulo,
            .mensaje,
            .fechaCreacion,
            .estado,
            estudiante: {
              id: estudiante._id,
              nombre: estudiante.nombreUsuario,
              email: estudiante.email
            },
            respuesta: CASE WHEN respuesta IS NOT NULL THEN {
              id: respuesta.id,
              mensaje: respuesta.mensaje,
              fechaRespuesta: respuesta.fechaRespuesta,
              docente: {
                id: docente._id,
                nombre: docente.nombreUsuario,
                email: docente.email
              }
            } ELSE null END
          }
        ELSE null END
      ) as consultas
    `, {
      cursoId: cursoId as string
    });

    const consultas = result.records[0]?.get('consultas') || [];
    
    console.log('Consultas encontradas:', consultas.length);
      return res.status(200).json({ 
      success: true, 
      consultas: consultas.filter((c: any) => c !== null)
    });

  } catch (error) {
    console.error('Error obteniendo consultas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    await session.close();
  }
}

// Crear una nueva consulta
async function crearConsulta(req: NextApiRequest, res: NextApiResponse) {
  const { cursoId, estudianteId, titulo, mensaje } = req.body;

  if (!cursoId || !estudianteId || !titulo || !mensaje) {
    return res.status(400).json({ 
      error: 'cursoId, estudianteId, titulo y mensaje son requeridos' 
    });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    console.log('=== CREANDO NUEVA CONSULTA ===');
    console.log('Datos:', { cursoId, estudianteId, titulo, mensaje });    // Verificar que el estudiante existe y matricularlo automáticamente si no está matriculado
    const verificarYMatricular = await session.run(`
      MATCH (e:Usuario {_id: $estudianteId})
      MATCH (c:Curso {id: $cursoId})
      
      // Verificar si ya está matriculado
      OPTIONAL MATCH (e)-[:MATRICULADO_EN]->(c)
      
      // Si no está matriculado, matricularlo automáticamente
      FOREACH (_ IN CASE 
        WHEN NOT (e)-[:MATRICULADO_EN]->(c) 
        THEN [1] 
        ELSE [] 
      END |
        CREATE (e)-[:MATRICULADO_EN {fechaMatricula: datetime()}]->(c)
      )
      
      RETURN e, c
    `, {
      estudianteId,
      cursoId
    });

    if (verificarYMatricular.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario o curso no encontrado' 
      });
    }

    console.log('Usuario matriculado automáticamente para consultas');

    // Crear la consulta
    const consultaId = `consulta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fechaCreacion = new Date().toISOString();

    const resultado = await session.run(`
      MATCH (e:Usuario {_id: $estudianteId})
      MATCH (c:Curso {id: $cursoId})
      
      CREATE (consulta:Consulta {
        id: $consultaId,
        titulo: $titulo,
        mensaje: $mensaje,
        fechaCreacion: $fechaCreacion,
        estado: 'pendiente'
      })
      
      CREATE (c)-[:TIENE_CONSULTA]->(consulta)
      CREATE (consulta)-[:CREADA_POR]->(e)
      
      RETURN consulta {
        .id,
        .titulo,
        .mensaje,
        .fechaCreacion,
        .estado,
        estudiante: {
          id: e._id,
          nombre: e.nombreUsuario,
          email: e.email
        }
      } as nuevaConsulta
    `, {
      estudianteId,
      cursoId,
      consultaId,
      titulo,
      mensaje,
      fechaCreacion
    });

    const nuevaConsulta = resultado.records[0]?.get('nuevaConsulta');

    console.log('Consulta creada exitosamente:', nuevaConsulta.id);

    return res.status(201).json({ 
      success: true, 
      consulta: nuevaConsulta 
    });

  } catch (error) {
    console.error('Error creando consulta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    await session.close();
  }
}
