import { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db("ProyectoIBasesII");
    const usuarios = db.collection('Usuarios');

    const { ids, id } = req.query;

    if (id) {
      // Obtener un usuario específico por ID
      try {
        const usuario = await usuarios.findOne({ _id: new ObjectId(id as string) });
        if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        return res.status(200).json({
          ok: true,
          usuario: {
            _id: usuario._id,
            nombreCompleto: `${usuario.nombre} ${usuario.apellido1} ${usuario.apellido2}`.trim(),
            nombre: usuario.nombre,
            apellido1: usuario.apellido1,
            apellido2: usuario.apellido2,
            nombreUsuario: usuario.nombreUsuario
          }
        });
      } catch (error) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
      }
    }

    if (ids) {
      // Obtener múltiples usuarios por array de IDs
      try {
        const idsArray = Array.isArray(ids) ? ids : [ids];
        const objectIds = idsArray.map((id: string) => new ObjectId(id));
        
        const usuarios_result = await usuarios.find({ _id: { $in: objectIds } }).toArray();
        
        const usuariosInfo = usuarios_result.map((usuario: any) => ({
          _id: usuario._id,
          nombreCompleto: `${usuario.nombre} ${usuario.apellido1} ${usuario.apellido2}`.trim(),
          nombre: usuario.nombre,
          apellido1: usuario.apellido1,
          apellido2: usuario.apellido2,
          nombreUsuario: usuario.nombreUsuario
        }));

        return res.status(200).json({ ok: true, usuarios: usuariosInfo });
      } catch (error) {
        return res.status(400).json({ message: 'IDs de usuario inválidos' });
      }
    }

    return res.status(400).json({ message: 'Se requiere parámetro id o ids' });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
