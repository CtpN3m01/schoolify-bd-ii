import { NextApiRequest, NextApiResponse } from 'next';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { consultaId, usuarioId } = req.body;

    if (!consultaId || !usuarioId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const session = driver.session();

    try {
      // Verificar que la consulta existe y pertenece al usuario
      const verificarQuery = `
        MATCH (u:Usuario {_id: $usuarioId})-[:CONSULTO]->(c:Consulta {id: $consultaId})
        RETURN c
      `;

      const verificarResult = await session.run(verificarQuery, {
        usuarioId,
        consultaId
      });

      if (verificarResult.records.length === 0) {
        return res.status(403).json({ 
          error: 'No tienes permisos para eliminar esta consulta o la consulta no existe' 
        });
      }

      // Eliminar la consulta y todas sus relaciones (incluyendo respuestas)
      const eliminarQuery = `
        MATCH (c:Consulta {id: $consultaId})
        OPTIONAL MATCH (c)-[:TIENE_RESPUESTA]->(r:Respuesta)
        DETACH DELETE c, r
      `;

      await session.run(eliminarQuery, { consultaId });

      res.status(200).json({ 
        success: true, 
        message: 'Consulta eliminada exitosamente' 
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error eliminando consulta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
