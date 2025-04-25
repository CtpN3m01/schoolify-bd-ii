import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
const { connectMongoDB } = require('../connection/conector-mongoDB');

// Endpoint para actualizar el array completo de módulos/secciones de un curso
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { cursoId, modulos } = req.body;
  if (!cursoId || !Array.isArray(modulos)) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
    console.log('Intentando actualizar curso:', cursoId);
    console.dir(modulos, { depth: null });
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const cursos = db.collection('Cursos');
    // Actualiza el campo 'contenido' con el nuevo array de módulos
    const result = await cursos.updateOne(
      { _id: typeof cursoId === 'string' ? new ObjectId(cursoId) : cursoId },
      { $set: { contenido: modulos } }
    );
    if (result.modifiedCount === 1) {
      return res.status(200).json({ message: 'Módulos actualizados correctamente' });
    } else {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
  } catch (error) {
    console.error('Error en actualizar_modulos:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: 'Error en el servidor', error: errorMessage });
  }
}
