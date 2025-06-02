import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

// Obtiene usuarios que tienen conversaciones con el usuario especificado
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'Falta parámetro userId' });
  }
  
  const driver = connectNeo4j();
  const session = driver.session();
  
  try {    // Buscar usuarios que tienen conversaciones con el usuario especificado
    const result = await session.run(
      `MATCH (currentUser:Usuario {_id: $userId})
       
       // Encontrar usuarios únicos con conversaciones
       MATCH (otherUser:Usuario)
       WHERE otherUser._id <> $userId
         AND (
           EXISTS((currentUser)-[:ENVIA]->(:Mensaje)-[:PARA]->(otherUser)) OR
           EXISTS((otherUser)-[:ENVIA]->(:Mensaje)-[:PARA]->(currentUser))
         )
       
       // Obtener el último mensaje entre ambos usuarios
       CALL {
         WITH currentUser, otherUser
         MATCH (sender)-[:ENVIA]->(msg:Mensaje)-[:PARA]->(receiver)
         WHERE (sender = currentUser AND receiver = otherUser) 
            OR (sender = otherUser AND receiver = currentUser)
         RETURN msg
         ORDER BY msg.epochMillis DESC
         LIMIT 1
       }
       
       // Contar mensajes no leídos del otro usuario hacia mí
       CALL {
         WITH currentUser, otherUser
         MATCH (otherUser)-[:ENVIA]->(unreadMsg:Mensaje)-[:PARA]->(currentUser)
         RETURN COUNT(unreadMsg) AS unreadCount
       }
       
       RETURN DISTINCT
              otherUser._id AS _id,
              otherUser.nombreUsuario AS nombreUsuario,
              otherUser.nombre AS nombre,
              otherUser.apellido1 AS apellido1,
              otherUser.apellido2 AS apellido2,
              otherUser.foto AS foto,
              msg AS lastMessage,
              unreadCount
       
       ORDER BY 
         CASE WHEN msg IS NOT NULL THEN msg.epochMillis ELSE 0 END DESC`,
      { userId }
    );    const usuariosConConversaciones = result.records.map(record => ({
      _id: record.get('_id'),
      nombreUsuario: record.get('nombreUsuario'),
      nombre: record.get('nombre'),
      apellido1: record.get('apellido1'),
      apellido2: record.get('apellido2'),
      foto: record.get('foto'),
      ultimoMensaje: record.get('lastMessage') ? {
        _id: record.get('lastMessage')._id,
        from: record.get('lastMessage').from,
        to: record.get('lastMessage').to,
        contenido: record.get('lastMessage').contenido,
        fecha: record.get('lastMessage').fecha,
        epochMillis: record.get('lastMessage').epochMillis
      } : null,
      unreadCount: record.get('unreadCount') ? record.get('unreadCount').toNumber() : 0
    }));
    
    // Filtrar duplicados por _id en caso de que aún los haya
    const usuariosUnicos = usuariosConConversaciones.filter((usuario, index, array) => 
      array.findIndex(u => u._id === usuario._id) === index
    );
    
    console.log(`Encontrados ${usuariosUnicos.length} usuarios únicos con conversaciones para ${userId}`);
      res.status(200).json({ 
      success: true, 
      usuarios: usuariosUnicos
    });
  } catch (error) {
    console.error('Error en usuarios-con-conversaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo usuarios con conversaciones', 
      error: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
