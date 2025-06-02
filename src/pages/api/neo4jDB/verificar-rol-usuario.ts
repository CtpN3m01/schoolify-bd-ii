import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { cursoId, usuarioId } = req.query;

  if (!cursoId || !usuarioId) {
    return res.status(400).json({ error: 'cursoId y usuarioId son requeridos' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    console.log('=== VERIFICANDO ROL DE USUARIO ===');
    console.log('Datos:', { cursoId, usuarioId });

    const result = await session.run(`
      MATCH (u:Usuario {_id: $usuarioId})
      MATCH (c:Curso {id: $cursoId})
      
      OPTIONAL MATCH (u)-[:ES_DOCENTE_DE]->(c)
      OPTIONAL MATCH (u)-[:MATRICULADO_EN]->(c)
      
      RETURN u {
        ._id,
        .nombreUsuario,
        .email
      } as usuario,
      c {
        .id,
        .nombreCurso,
        .nombreUsuarioDocente
      } as curso,
      CASE WHEN (u)-[:ES_DOCENTE_DE]->(c) THEN 'docente'
           WHEN (u)-[:MATRICULADO_EN]->(c) THEN 'estudiante'
           ELSE 'sin_acceso'
      END as rol
    `, {
      usuarioId: usuarioId as string,
      cursoId: cursoId as string
    });

    if (result.records.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario o curso no encontrado' 
      });
    }

    const record = result.records[0];
    const usuario = record.get('usuario');
    const curso = record.get('curso');
    const rol = record.get('rol');

    console.log('Rol verificado:', { usuario: usuario.nombreUsuario, curso: curso.nombreCurso, rol });

    return res.status(200).json({
      success: true,
      usuario,
      curso,
      rol,
      esDocente: rol === 'docente',
      esEstudiante: rol === 'estudiante',
      tieneAcceso: rol !== 'sin_acceso'
    });

  } catch (error) {
    console.error('Error verificando rol:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    await session.close();
  }
}
