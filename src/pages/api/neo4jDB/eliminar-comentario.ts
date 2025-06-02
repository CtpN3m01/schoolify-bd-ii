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
    const { comentarioId, usuarioId } = req.body;

    if (!comentarioId || !usuarioId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const session = driver.session();

    try {
      // Verificar que el comentario existe y pertenece al usuario
      const verificarQuery = `
        MATCH (u:Usuario {_id: $usuarioId})-[:COMENTO]->(c:Comentario {id: $comentarioId})
        RETURN c
      `;

      const verificarResult = await session.run(verificarQuery, {
        usuarioId,
        comentarioId
      });

      if (verificarResult.records.length === 0) {
        return res.status(403).json({ 
          error: 'No tienes permisos para eliminar este comentario o el comentario no existe' 
        });
      }

      // Eliminar el comentario y todas sus relaciones
      const eliminarQuery = `
        MATCH (c:Comentario {id: $comentarioId})
        DETACH DELETE c
      `;

      await session.run(eliminarQuery, { comentarioId });

      res.status(200).json({ 
        success: true, 
        message: 'Comentario eliminado exitosamente' 
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error eliminando comentario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
