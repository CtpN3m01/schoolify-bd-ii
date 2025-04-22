import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
const { connectMongoDB } = require('../../connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const {
    nombreUsuario,
    password,
    nombre,
    apellido1,
    apellido2,
    fechaNacimiento,
    foto
  } = req.body;

  if (!nombreUsuario || !password || !nombre || !apellido1 || !apellido2 || !fechaNacimiento) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const client = await connectMongoDB();
    const db = client.db("ProyectoIBasesII");
    const usuarios = db.collection('Usuarios');

    // Verificar si el usuario ya existe
    const existe = await usuarios.findOne({ nombreUsuario });
    if (existe) {
      return res.status(409).json({ message: 'El nombre de usuario ya está registrado' });
    }

    // Generar salt y hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Crear el usuario
    const nuevoUsuario = {
      nombreUsuario,
      password: hash,
      salt,
      nombre,
      apellido1,
      apellido2,
      fechaNacimiento,
      foto: foto || null,
      createdAt: new Date()
    };

    await usuarios.insertOne(nuevoUsuario);
    console.log('Usuario registrado:', nuevoUsuario);
    return res.status(201).json({ message: 'Usuario registrado correctamente' });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}
