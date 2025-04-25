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
    // Crear el mensaje y las relaciones
    const result = await session.run(
      `MATCH (from:Usuario {_id: $fromId}), (to:Usuario {_id: $toId})
       CREATE (from)-[:ENVIA]->(m:Mensaje {
         contenido: $contenido,
         fecha: datetime(),
         epochMillis: datetime().epochMillis
       }),
       (m)-[:PARA]->(to)
       RETURN m` ,
      { fromId, toId, contenido }
    );
    const mensaje = result.records[0]?.get('m').properties;
    res.status(201).json({ success: true, mensaje });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error guardando mensaje en Neo4j', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
