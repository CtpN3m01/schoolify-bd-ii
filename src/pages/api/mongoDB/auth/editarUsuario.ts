import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
const { connectMongoDB } = require('../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombreUsuario, nuevoNombreUsuario, nombre, apellido1, apellido2, fechaNacimiento, foto } = req.body;
  if (!nombreUsuario || !nuevoNombreUsuario) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const usuarios = db.collection('Usuarios');

    // Si el nombre de usuario cambia, verificar que no exista otro igual
    if (nombreUsuario !== nuevoNombreUsuario) {
      const existe = await usuarios.findOne({ nombreUsuario: nuevoNombreUsuario });
      if (existe) {
        return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
      }
    }

    const result = await usuarios.updateOne(
      { nombreUsuario },
      { $set: {
          nombreUsuario: nuevoNombreUsuario,
          nombre,
          apellido1,
          apellido2,
          fechaNacimiento,
          foto
        }
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener el usuario actualizado
    const usuarioActualizado = await usuarios.findOne({ nombreUsuario: nuevoNombreUsuario });
    // Generar nuevo JWT y setear cookie si el nombre de usuario cambió
    if (usuarioActualizado) {
      const token = jwt.sign(
        {
          nombreUsuario: usuarioActualizado.nombreUsuario,
          nombre: usuarioActualizado.nombre,
          apellido1: usuarioActualizado.apellido1,
          apellido2: usuarioActualizado.apellido2,
          fechaNacimiento: usuarioActualizado.fechaNacimiento,
          foto: usuarioActualizado.foto || null
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      res.setHeader('Set-Cookie', serialize('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      }));
    }
    return res.status(200).json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
