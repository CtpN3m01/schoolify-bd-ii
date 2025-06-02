import { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from '../neo4jDB/connection/neo4j-connector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuarioId, cursoId } = req.query;

  if (!usuarioId || !cursoId) {
    return res.status(400).json({ error: 'usuarioId y cursoId son requeridos' });
  }

  const driver = connectNeo4j();
  const session = driver.session();

  try {
    // Verificar si el usuario existe
    const verificarUsuario = await session.run(`
      MATCH (u:Usuario {_id: $usuarioId})
      RETURN u
    `, { usuarioId });

    console.log('Usuario encontrado:', verificarUsuario.records.length > 0);
    if (verificarUsuario.records.length > 0) {
      console.log('Propiedades del usuario:', verificarUsuario.records[0].get('u').properties);
    }

    // Verificar si el curso existe
    const verificarCurso = await session.run(`
      MATCH (c:Curso {id: $cursoId})
      RETURN c
    `, { cursoId });

    console.log('Curso encontrado:', verificarCurso.records.length > 0);
    if (verificarCurso.records.length > 0) {
      console.log('Propiedades del curso:', verificarCurso.records[0].get('c').properties);
    }

    // Verificar matriculación
    const verificarMatricula = await session.run(`
      MATCH (u:Usuario {_id: $usuarioId})
      MATCH (c:Curso {id: $cursoId})
      OPTIONAL MATCH (u)-[r:MATRICULADO_EN]->(c)
      OPTIONAL MATCH (u)-[d:ES_DOCENTE_DE]->(c)
      RETURN u, c, r, d,
             CASE 
               WHEN r IS NOT NULL THEN 'matriculado'
               WHEN d IS NOT NULL THEN 'docente'
               ELSE 'sin_relacion'
             END as relacion
    `, { usuarioId, cursoId });

    console.log('Relación encontrada:', verificarMatricula.records.length > 0);
    if (verificarMatricula.records.length > 0) {
      const record = verificarMatricula.records[0];
      console.log('Relación:', record.get('relacion'));
      console.log('Matricula existe:', record.get('r') !== null);
      console.log('Es docente:', record.get('d') !== null);
    }

    res.status(200).json({
      usuarioExiste: verificarUsuario.records.length > 0,
      cursoExiste: verificarCurso.records.length > 0,
      relacion: verificarMatricula.records.length > 0 ? verificarMatricula.records[0].get('relacion') : 'no_encontrada',
      debug: {
        usuarioProps: verificarUsuario.records.length > 0 ? verificarUsuario.records[0].get('u').properties : null,
        cursoProps: verificarCurso.records.length > 0 ? verificarCurso.records[0].get('c').properties : null
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message 
    });
  } finally {
    await session.close();
  }
}
