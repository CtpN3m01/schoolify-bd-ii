import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { consultaId, docenteId, mensaje } = req.body;

  if (!consultaId || !docenteId || !mensaje) {
    return res.status(400).json({ 
      error: 'consultaId, docenteId y mensaje son requeridos' 
    });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    console.log('=== RESPONDIENDO CONSULTA ===');
    console.log('Datos:', { consultaId, docenteId, mensaje });

    // Verificar que el docente tiene permisos para responder
    const verificarDocente = await session.run(`
      MATCH (consulta:Consulta {id: $consultaId})<-[:TIENE_CONSULTA]-(c:Curso)<-[:ES_DOCENTE_DE]-(d:Usuario {_id: $docenteId})
      RETURN consulta, c, d
    `, {
      consultaId,
      docenteId
    });

    if (verificarDocente.records.length === 0) {
      return res.status(403).json({ 
        error: 'No tienes permisos para responder esta consulta' 
      });
    }

    // Crear la respuesta
    const respuestaId = `respuesta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fechaRespuesta = new Date().toISOString();

    const resultado = await session.run(`
      MATCH (consulta:Consulta {id: $consultaId})
      MATCH (d:Usuario {_id: $docenteId})
      
      CREATE (respuesta:RespuestaConsulta {
        id: $respuestaId,
        mensaje: $mensaje,
        fechaRespuesta: $fechaRespuesta
      })
      
      CREATE (consulta)-[:TIENE_RESPUESTA]->(respuesta)
      CREATE (respuesta)-[:RESPONDIDA_POR]->(d)
      
      SET consulta.estado = 'respondida'
      
      RETURN respuesta {
        .id,
        .mensaje,
        .fechaRespuesta,
        docente: {
          id: d._id,
          nombre: d.nombreUsuario,
          email: d.email
        }
      } as nuevaRespuesta
    `, {
      consultaId,
      docenteId,
      respuestaId,
      mensaje,
      fechaRespuesta
    });

    const nuevaRespuesta = resultado.records[0]?.get('nuevaRespuesta');

    console.log('Respuesta creada exitosamente:', nuevaRespuesta.id);

    return res.status(201).json({ 
      success: true, 
      respuesta: nuevaRespuesta 
    });

  } catch (error) {
    console.error('Error respondiendo consulta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    await session.close();
  }
}
