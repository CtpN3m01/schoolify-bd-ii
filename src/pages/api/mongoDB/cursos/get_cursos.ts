import { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const cursos = db.collection('Cursos');
    const cursosList = await cursos.find({}).toArray();
    return res.status(200).json({ cursos: cursosList });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
