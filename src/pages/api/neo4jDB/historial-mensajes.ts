import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// Espera query: fromId, toId
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { fromId, toId } = req.query;
  if (!fromId || !toId) {
    return res.status(400).json({ message: 'Faltan parámetros obligatorios' });
  }
  
  const driver = connectNeo4j();
  const session = driver.session();
  
  try {
    // Primero verificar que ambos usuarios existen
    const checkUsers = await session.run(
      `OPTIONAL MATCH (from:Usuario {_id: $fromId})
       OPTIONAL MATCH (to:Usuario {_id: $toId})
       RETURN from._id as fromExists, to._id as toExists`,
      { fromId, toId }
    );
    
    const userCheck = checkUsers.records[0];
    const fromExists = userCheck?.get('fromExists') !== null;
    const toExists = userCheck?.get('toExists') !== null;
    
    console.log(`Verificación usuarios - From: ${fromExists}, To: ${toExists}`);
    
    // Buscar mensajes entre ambos usuarios (en ambos sentidos)
    const result = await session.run(
      `CALL {
        MATCH (a:Usuario {_id: $fromId})-[:ENVIA]->(m:Mensaje)-[:PARA]->(b:Usuario {_id: $toId})
        RETURN m, a._id AS from, b._id AS to
        UNION
        MATCH (a:Usuario {_id: $toId})-[:ENVIA]->(m:Mensaje)-[:PARA]->(b:Usuario {_id: $fromId})
        RETURN m, a._id AS from, b._id AS to
      }
      RETURN m, from, to
      ORDER BY m.epochMillis ASC`,
      { fromId, toId }
    );
      const mensajes = result.records.map(r => ({
      ...r.get('m').properties,
      from: r.get('from'),
      to: r.get('to')
    }));
    
    // Eliminar duplicados potenciales basados en ID único
    const mensajesUnicos = mensajes.filter((mensaje, index, array) => {
      return array.findIndex(m => m._id === mensaje._id) === index;
    });
    
    console.log(`Historial encontrado: ${mensajes.length} mensajes, ${mensajesUnicos.length} únicos entre ${fromId} y ${toId}`);
      res.status(200).json({ 
      success: true, 
      mensajes: mensajesUnicos,
      debug: {
        fromExists,
        toExists,
        totalMensajes: mensajes.length,
        mensajesUnicos: mensajesUnicos.length
      }
    });
  } catch (error) {
    console.error('Error en historial-mensajes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo historial de mensajes', 
      error: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
