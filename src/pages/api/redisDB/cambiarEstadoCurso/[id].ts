import type { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../../mongoDB/connection/conector-mongoDB');
import redis from '../connection/redisClient';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Método no permitido' });
  const { id } = req.query;
  const { estado } = req.body;
  if (!id || !estado) return res.status(400).json({ error: 'Faltan parámetros' });

  // 1. Asegura base de datos correcta y busca por string y ObjectId
  const client = await connectMongoDB();
  const db = client.db('ProyectoIBasesII');
  const cursos = db.collection('Cursos');
  let curso = await cursos.findOne({ _id: typeof id === 'string' ? id : id[0] });
  if (!curso) {
    try {
      const objectId = new ObjectId(typeof id === 'string' ? id : id[0]);
      curso = await cursos.findOne({ _id: objectId });
    } catch (e) {}
  }
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
  await cursos.updateOne({ _id: curso._id }, { $set: { estado } });
  // Obtener el curso actualizado
  const cursoActualizado = { ...curso, estado };

  // 2. Actualizar llaves de Redis
  const estados = ['Publicado', 'Edición', 'Activo', 'Cancelado'];
  for (const est of estados) {
    await redis.srem(`cursos:${est.toLowerCase()}`, String(curso._id));
  }
  await redis.sadd(`cursos:${estado.toLowerCase()}`, String(curso._id));

  // 3. Guardar el estado como hash para consulta rápida
  await redis.hset('curso_estados', String(curso._id), estado);

  // 4. Guardar el curso completo serializado en Redis
  await redis.set(`curso:${curso._id}`, JSON.stringify(cursoActualizado));

  return res.status(200).json({ ok: true });
}
