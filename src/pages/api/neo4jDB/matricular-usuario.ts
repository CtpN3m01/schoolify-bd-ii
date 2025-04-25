import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId, cursoId, limiteUsuarios } = req.body;
  if (!userId || !cursoId || typeof limiteUsuarios !== 'number') {
    return res.status(400).json({ message: 'Faltan parámetros requeridos (userId, cursoId, limiteUsuarios)' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // Contar usuarios ya matriculados
    const countResult = await session.run(
      'MATCH (u:Usuario)-[:MATRICULADO_EN]->(c:Curso {id: $cursoId}) RETURN count(u) AS count',
      { cursoId }
    );
    const count = countResult.records[0]?.get('count').toInt() || 0;
    if (count >= limiteUsuarios) {
      return res.status(409).json({ message: 'El curso ya alcanzó el límite de usuarios matriculados.' });
    }
    // Verificar si ya está matriculado
    const existsResult = await session.run(
      'MATCH (u:Usuario {id: $userId})-[:MATRICULADO_EN]->(c:Curso {id: $cursoId}) RETURN u',
      { userId, cursoId }
    );
    if (existsResult.records.length > 0) {
      return res.status(200).json({ message: 'El usuario ya está matriculado en el curso.' });
    }
    // Crear relación de matrícula
    await session.run(
      'MATCH (u:Usuario {id: $userId}), (c:Curso {id: $cursoId}) CREATE (u)-[:MATRICULADO_EN]->(c)',
      { userId, cursoId }
    );
    res.status(201).json({ message: 'Usuario matriculado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al matricular usuario', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
