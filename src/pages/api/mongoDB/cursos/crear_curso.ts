import { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombreCurso, descripcion, fechaInicio, fechaFin, foto, estado, nombreUsuarioDocente, contenido } = req.body;
  if (!nombreCurso || !descripcion || !fechaInicio || !fechaFin || !nombreUsuarioDocente) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const cursos = db.collection('Cursos');
    const nuevoCurso = {
      nombreCurso,
      descripcion,
      fechaInicio,
      fechaFin,
      foto: foto || '',
      estado: estado || 'Activo',
      nombreUsuarioDocente,
      contenido: Array.isArray(contenido) ? contenido : []
    };
    await cursos.insertOne(nuevoCurso);
    return res.status(201).json({ message: 'Curso creado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
