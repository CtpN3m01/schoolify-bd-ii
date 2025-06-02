import type { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { seccionId } = req.query;

  if (!seccionId) {
    return res.status(400).json({ message: 'seccionId es requerido' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('schoolify');
    const collection = db.collection('comentarios');

    const comentarios = await collection
      .find({ seccionId })
      .sort({ fecha: 1 })
      .toArray();

    res.status(200).json({ comentarios });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
