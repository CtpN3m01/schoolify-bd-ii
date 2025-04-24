import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
import axios from 'axios';

// GET: Lista de amigos de un usuario
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Falta userId' });
  }
  const driver = connectNeo4j();
  const session = driver.session();
  try {
    // Buscar usuario en MongoDB por username si se provee
    if (req.query.username) {
      // Llama a la API de MongoDB para buscar usuario
      const mongoRes = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/mongoDB/Usuarios/buscar-usuario?username=${req.query.username}`);
      if (mongoRes.data && mongoRes.data._id) {
        // Buscar amigos en Neo4j usando el _id de MongoDB
        const result = await session.run(`
          MATCH (yo:Usuario {_id: $userId})-[:AMIGO]-(amigo:Usuario {_id: $amigoId})
          RETURN amigo._id AS id, amigo.nombre AS name, amigo.foto AS avatar, amigo.estado AS status, amigo.descripcion AS description, amigo.universidad AS university
        `, { userId, amigoId: mongoRes.data._id });
        const amigos = result.records.map(r => ({
          id: r.get('id'),
          name: r.get('name'),
          avatar: r.get('avatar'),
          status: r.get('status') || 'Desconocido',
          description: r.get('description'),
          university: r.get('university')
        }));
        return res.status(200).json({ success: true, amigos });
      } else {
        return res.status(404).json({ message: 'Usuario no encontrado en MongoDB' });
      }
    }

    const result = await session.run(`
      MATCH (yo:Usuario {_id: $userId})-[:AMIGO]-(amigo:Usuario)
      RETURN amigo._id AS id, amigo.nombre AS name, amigo.foto AS avatar, amigo.estado AS status, amigo.descripcion AS description, amigo.universidad AS university
    `, { userId });
    const amigos = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      avatar: r.get('avatar'),
      status: r.get('status') || 'Desconocido',
      description: r.get('description'),
      university: r.get('university')
    }));
    res.status(200).json({ success: true, amigos });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo amigos', error: (error as Error).message });
  } finally {
    await session.close();
  }
}
