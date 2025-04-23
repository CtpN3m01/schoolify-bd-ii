import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
const { connectMongoDB } = require('../../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombreUsuario, password } = req.body;

  if (!nombreUsuario || !password) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db('ProyectoIBasesII');
    const usuarios = db.collection('Usuarios');

    // Buscar usuario
    const usuario = await usuarios.findOne({ nombreUsuario });
    if (!usuario) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Comparar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        nombreUsuario: usuario.nombreUsuario,
        nombre: usuario.nombre,
        apellido1: usuario.apellido1,
        apellido2: usuario.apellido2,
        fechaNacimiento: usuario.fechaNacimiento,
        foto: usuario.foto || null
      },
      process.env.JWT_SECRET || 'secret', // Usa una variable de entorno segura
      { expiresIn: '7d' }
    );

    // Guardar el token en una cookie httpOnly
    res.setHeader('Set-Cookie', serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    }));

    return res.status(200).json({ message: 'Login exitoso', usuario: {
      nombreUsuario: usuario.nombreUsuario,
      nombre: usuario.nombre,
      apellido1: usuario.apellido1,
      apellido2: usuario.apellido2,
      fechaNacimiento: usuario.fechaNacimiento,
      foto: usuario.foto || null
    }});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
