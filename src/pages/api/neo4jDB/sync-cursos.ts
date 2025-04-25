import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { client, connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

// Sincroniza todos los cursos de MongoDB a Neo4j usando _id como identificador
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // 1. Obtener todos los cursos de MongoDB
    await connectMongoDB();
    const database = client.db('ProyectoIBasesII');
    const collection = database.collection('Cursos');
    const cursos = await collection.find({}).toArray();

    // 2. Insertar o actualizar cada curso como nodo en Neo4j
    for (const curso of cursos) {
      // Validar formato de fecha (YYYY-MM-DD)
      const fechaInicio = (typeof curso.fechaInicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(curso.fechaInicio)) ? curso.fechaInicio : null;
      const fechaFin = (typeof curso.fechaFin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(curso.fechaFin)) ? curso.fechaFin : null;
      await session.run(
        `MERGE (c:Curso {_id: $_id})
         SET c.nombreCurso = $nombreCurso,
             c.descripcion = $descripcion,
             c.fechaInicio = CASE WHEN $fechaInicio IS NOT NULL THEN date($fechaInicio) ELSE NULL END,
             c.fechaFin = CASE WHEN $fechaFin IS NOT NULL THEN date($fechaFin) ELSE NULL END,
             c.foto = $foto,
             c.estado = $estado,
             c.nombreUsuarioDocente = $nombreUsuarioDocente`,
        {
          _id: curso._id ? curso._id.toString() : '',
          nombreCurso: curso.nombreCurso || '',
          descripcion: curso.descripcion || '',
          fechaInicio,
          fechaFin,
          foto: curso.foto || '',
          estado: curso.estado || '',
          nombreUsuarioDocente: curso.nombreUsuarioDocente || ''
        }
      );
    }

    res.status(200).json({ success: true, count: cursos.length, message: 'Cursos sincronizados en Neo4j usando _id.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error migrando cursos a Neo4j', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
