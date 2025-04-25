import type { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../../connection/conector-mongoDB');
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Método no permitido' });
  const { id } = req.query;
  const { nombreCurso, descripcion, fechaInicio, fechaFin, foto } = req.body;
  if (!id) return res.status(400).json({ error: 'Falta el parámetro id' });

  const client = await connectMongoDB();
  const db = client.db('ProyectoIBasesII');
  const cursos = db.collection('Cursos');

  // Buscar por string y luego por ObjectId
  let curso = await cursos.findOne({ _id: typeof id === 'string' ? id : id[0] });
  if (!curso) {
    try {
      const objectId = new ObjectId(typeof id === 'string' ? id : id[0]);
      curso = await cursos.findOne({ _id: objectId });
    } catch (e) {}
  }
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

  const update: any = {};
  if (nombreCurso !== undefined) update.nombreCurso = nombreCurso;
  if (descripcion !== undefined) update.descripcion = descripcion;
  if (fechaInicio !== undefined) update.fechaInicio = fechaInicio;
  if (fechaFin !== undefined) update.fechaFin = fechaFin;
  if (foto !== undefined) update.foto = foto;

  await cursos.updateOne({ _id: curso._id }, { $set: update });
  const cursoActualizado = await cursos.findOne({ _id: curso._id });
  return res.status(200).json({ ok: true, curso: cursoActualizado });
}
