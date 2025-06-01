import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// Espera body: { fromId, toId, contenido }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { fromId, toId, contenido } = req.body;
  if (!fromId || !toId || !contenido) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }
  
  const driver = connectNeo4j();
  const session = driver.session();
  
  try {
    // Primero verificar que ambos usuarios existen
    const checkUsers = await session.run(
      `MATCH (from:Usuario {_id: $fromId}), (to:Usuario {_id: $toId})
       RETURN from._id as fromExists, to._id as toExists`,
      { fromId, toId }
    );
    
    if (checkUsers.records.length === 0) {
      // Si no encontró ambos usuarios, verificar cuál falta
      const checkFrom = await session.run('MATCH (u:Usuario {_id: $fromId}) RETURN u._id', { fromId });
      const checkTo = await session.run('MATCH (u:Usuario {_id: $toId}) RETURN u._id', { toId });
      
      const fromExists = checkFrom.records.length > 0;
      const toExists = checkTo.records.length > 0;
      
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado',
        details: {
          fromExists,
          toExists,
          fromId,
          toId
        }
      });
    }
    
    // Crear el mensaje y las relaciones
    const result = await session.run(
      `MATCH (from:Usuario {_id: $fromId}), (to:Usuario {_id: $toId})
       CREATE (from)-[:ENVIA]->(m:Mensaje {
         _id: randomUUID(),
         contenido: $contenido,
         fecha: datetime(),
         epochMillis: datetime().epochMillis
       }),
       (m)-[:PARA]->(to)
       RETURN m`,
      { fromId, toId, contenido }
    );
    
    if (result.records.length === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo crear el mensaje' 
      });
    }
    
    const mensaje = result.records[0]?.get('m').properties;
    //console.log('Mensaje guardado en Neo4j:', mensaje);
    
    res.status(201).json({ success: true, mensaje });
  } catch (error) {
    console.error('Error en enviar-mensaje:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error guardando mensaje en Neo4j', 
      error: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
