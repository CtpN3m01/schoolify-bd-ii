import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { client, connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // 1. Obtener todos los usuarios de MongoDB
    await connectMongoDB();
    const database = client.db('ProyectoIBasesII');
    const collection = database.collection('Usuarios');
    const usuarios = await collection.find({}).toArray();

    // 2. Insertar o actualizar cada usuario como nodo en Neo4j
    for (const usuario of usuarios) {
      await session.run(
        `MERGE (u:Usuario {_id: $_id})
         SET u.nombreUsuario = $nombreUsuario,
             u.nombre = $nombre,
             u.apellido1 = $apellido1,
             u.apellido2 = $apellido2,
             u.fechaNacimiento = $fechaNacimiento,
             u.foto = $foto,
             u.rol = $rol`,
        {
          nombreUsuario: usuario.nombreUsuario || '',
          nombre: usuario.nombre || '',
          apellido1: usuario.apellido1 || '',
          apellido2: usuario.apellido2 || '',
          fechaNacimiento: usuario.fechaNacimiento || '',
          foto: usuario.foto || '',
          _id: usuario._id ? usuario._id.toString() : '',
          rol: 'usuario'
        }
      );
    }

    res.status(200).json({ success: true, count: usuarios.length, message: 'Usuarios sincronizados en Neo4j sin eliminar relaciones.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error migrando usuarios a Neo4j', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
