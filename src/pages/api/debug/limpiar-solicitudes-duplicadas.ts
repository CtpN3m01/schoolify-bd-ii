import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from '../neo4jDB/connection/neo4j-connector';

// GET: Limpiar solicitudes duplicadas (herramienta de debug)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  
  const driver = connectNeo4j();
  const session = driver.session();
  
  try {
    // Encontrar y eliminar solicitudes duplicadas
    const result = await session.run(`
      MATCH (a:Usuario)-[r:SOLICITUD_AMISTAD]->(b:Usuario)
      WITH a, b, collect(r) as rels
      WHERE size(rels) > 1
      UNWIND rels[1..] as duplicateRel
      DELETE duplicateRel
      RETURN count(duplicateRel) as duplicatesDeleted
    `);
    
    const duplicatesDeleted = result.records[0]?.get('duplicatesDeleted')?.toNumber() || 0;
    
    res.status(200).json({ 
      success: true, 
      message: `Se eliminaron ${duplicatesDeleted} solicitudes duplicadas` 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error limpiando duplicados', 
      error: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
