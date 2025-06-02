import type { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { seccionId, texto, autor } = req.body;

  if (!seccionId || !texto || !autor) {
    return res.status(400).json({ message: 'seccionId, texto y autor son requeridos' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('schoolify');
    const collection = db.collection('comentarios');

    const nuevoComentario = {
      seccionId,
      texto: texto.trim(),
      autor,
      fecha: new Date(),
      fechaCreacion: new Date().toISOString()
    };

    const result = await collection.insertOne(nuevoComentario);

    res.status(201).json({ 
      message: 'Comentario agregado exitosamente',
      comentarioId: result.insertedId 
    });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
