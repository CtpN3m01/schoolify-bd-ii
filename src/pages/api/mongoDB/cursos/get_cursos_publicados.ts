import type { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');
import redis from '../../redisDB/connection/redisClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  // Obtener IDs de cursos publicados desde Redis
  const ids = await redis.smembers('cursos:publicado');
  if (!ids.length) return res.status(200).json({ cursos: [] });
  // Buscar los cursos en MongoDB
  const client = await connectMongoDB();
  const db = client.db();
  // Los _id en MongoDB pueden ser ObjectId o string, pero aquí se asume string
  const cursos = await db.collection('cursos').find({ _id: { $in: ids } }).toArray();
  return res.status(200).json({ cursos });
}
