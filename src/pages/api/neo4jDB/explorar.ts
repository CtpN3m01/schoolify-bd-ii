import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // Obtener hasta 100 nodos y sus propiedades
    const nodesResult = await session.run('MATCH (n) RETURN n LIMIT 100');
    // Obtener tipos de nodos
    const labelsResult = await session.run('MATCH (n) RETURN DISTINCT labels(n) AS labels');
    // Obtener tipos de relaciones
    const relTypesResult = await session.run('MATCH ()-[r]->() RETURN DISTINCT type(r) AS type');
    // Obtener relaciones con nodos origen y destino
    const relsResult = await session.run('MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 100');

    res.status(200).json({
      nodes: nodesResult.records.map(r => r.get('n').properties),
      nodeLabels: labelsResult.records.map(r => r.get('labels')),
      relationTypes: relTypesResult.records.map(r => r.get('type')),
      relations: relsResult.records.map(r => ({
        from: r.get('a').properties,
        relation: r.get('r').type,
        to: r.get('b').properties
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error explorando Neo4j', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
