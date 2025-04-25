import type { NextApiRequest, NextApiResponse } from 'next';
import redis from './connection/redisClient';
const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  // 1. Obtener IDs de cursos publicados desde Redis
  const ids = await redis.smembers('cursos:publicado');
  if (!ids.length) return res.status(200).json({ cursos: [] });

  // 2. Intentar obtener los cursos desde Redis
  const cursos: any[] = [];
  const idsFaltantes: string[] = [];
  for (const id of ids) {
    const data = await redis.get(`curso:${id}`);
    if (data) {
      try {
        cursos.push(JSON.parse(data));
      } catch {
        idsFaltantes.push(id);
      }
    } else {
      idsFaltantes.push(id);
    }
  }

  // 3. Si faltan cursos, obtenerlos de MongoDB y guardarlos en Redis
  if (idsFaltantes.length) {
    const client = await connectMongoDB();
    const db = client.db();
    const nuevos = await db.collection('cursos').find({ _id: { $in: idsFaltantes } }).toArray();
    for (const curso of nuevos) {
      await redis.set(`curso:${curso._id}`, JSON.stringify(curso));
      cursos.push(curso);
    }
  }

  return res.status(200).json({ cursos });
}
