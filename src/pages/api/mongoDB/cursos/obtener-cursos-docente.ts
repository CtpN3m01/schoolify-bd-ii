import { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('@/pages/api/mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombreUsuario } = req.query;

  if (!nombreUsuario) {
    return res.status(400).json({ message: 'Falta el nombre de usuario' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const cursosCollection = db.collection('Cursos');

    // Buscar cursos donde el usuario es docente
    const cursos = await cursosCollection.find({ 
      nombreUsuarioDocente: nombreUsuario 
    }).toArray();

    client.close();    return res.status(200).json({ 
      cursos: cursos.map((curso: any) => ({
        ...curso,
        _id: curso._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error al obtener cursos del docente:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
