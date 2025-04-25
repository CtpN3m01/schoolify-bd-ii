import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
const { connectMongoDB } = require('../connection/conector-mongoDB');

// Endpoint para agregar un módulo/sección a un curso existente
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { cursoId, modulo } = req.body;
  if (!cursoId || !modulo || !modulo.nombre) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  // Elimina _id si viene en el objeto modulo
  if (modulo._id) delete modulo._id;

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const cursos = db.collection('Cursos');
    // Agrega el módulo/sección con la estructura recibida
    const result = await cursos.updateOne(
      { _id: typeof cursoId === 'string' ? new ObjectId(cursoId) : cursoId },
      { $push: { contenido: modulo } }
    );
    if (result.modifiedCount === 1) {
      return res.status(200).json({ message: 'Módulo agregado correctamente' });
    } else {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
  } catch (error) {
    console.error('Error en agregar_modulo:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: 'Error en el servidor', error: errorMessage });
  }
}
