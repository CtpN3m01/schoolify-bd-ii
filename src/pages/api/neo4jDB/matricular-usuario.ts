import type { NextApiRequest, NextApiResponse } from 'next';
import { connectNeo4j } from './connection/neo4j-connector';
const { client, connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');
const { ObjectId } = require('mongodb');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }
  const { userId, usuarioId, cursoId, limiteUsuarios = 50 } = req.body;
  
  // Aceptar tanto userId como usuarioId para compatibilidad
  const finalUserId = userId || usuarioId;
  
  if (!finalUserId || !cursoId) {
    return res.status(400).json({ message: 'Faltan parámetros requeridos (userId/usuarioId, cursoId)' });
  }

  let driver, session;
    try {
    driver = connectNeo4j();    session = driver.session();

    // Obtener datos completos del curso desde MongoDB
    await connectMongoDB();
    const database = client.db('ProyectoIBasesII');
    const cursosCollection = database.collection('Cursos');
    const usuariosCollection = database.collection('Usuarios');    const curso = await cursosCollection.findOne({ _id: new ObjectId(cursoId) });
    const usuario = await usuariosCollection.findOne({ _id: new ObjectId(finalUserId) });
    
    if (!curso) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
      if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Crear/actualizar nodo Usuario con datos completos
    await session.run(
      `MERGE (u:Usuario {_id: $userId})
       SET u.nombreUsuario = $nombreUsuario,
           u.nombre = $nombre,
           u.apellido1 = $apellido1,
           u.apellido2 = $apellido2,
           u.fechaNacimiento = $fechaNacimiento,
           u.foto = $foto,
           u.rol = $rol`,
      {
        userId: finalUserId.toString(),
        nombreUsuario: usuario.nombreUsuario || '',
        nombre: usuario.nombre || '',
        apellido1: usuario.apellido1 || '',
        apellido2: usuario.apellido2 || '',
        fechaNacimiento: usuario.fechaNacimiento || '',
        foto: usuario.foto || '',
        rol: 'usuario'      }
    );
    
    // Crear/actualizar nodo Curso con datos completos
    const fechaInicio = (typeof curso.fechaInicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(curso.fechaInicio)) ? curso.fechaInicio : null;
    const fechaFin = (typeof curso.fechaFin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(curso.fechaFin)) ? curso.fechaFin : null;
    
    await session.run(
      `MERGE (c:Curso {_id: $cursoId})
       SET c.nombreCurso = $nombreCurso,
           c.descripcion = $descripcion,
           c.fechaInicio = CASE WHEN $fechaInicio IS NOT NULL THEN date($fechaInicio) ELSE NULL END,
           c.fechaFin = CASE WHEN $fechaFin IS NOT NULL THEN date($fechaFin) ELSE NULL END,
           c.foto = $foto,
           c.estado = $estado,
           c.nombreUsuarioDocente = $nombreUsuarioDocente`,
      {
        cursoId: cursoId.toString(),
        nombreCurso: curso.nombreCurso || '',
        descripcion: curso.descripcion || '',
        fechaInicio,
        fechaFin,
        foto: curso.foto || '',
        estado: curso.estado || '',
        nombreUsuarioDocente: curso.nombreUsuarioDocente || ''      }
    );

    // Contar usuarios ya matriculados
    const countResult = await session.run(
      'MATCH (u:Usuario)-[:MATRICULADO_EN]->(c:Curso {_id: $cursoId}) RETURN count(u) AS count',
      { cursoId: cursoId.toString() }
    );    const count = countResult.records[0]?.get('count').toInt() || 0;
    
    if (count >= limiteUsuarios) {
      return res.status(409).json({ message: 'El curso ya alcanzó el límite de usuarios matriculados.' });    }
      // Verificar si ya está matriculado
    const existsResult = await session.run(
      'MATCH (u:Usuario {_id: $userId})-[:MATRICULADO_EN]->(c:Curso {_id: $cursoId}) RETURN u',
      { userId: finalUserId.toString(), cursoId: cursoId.toString() }
    );
      if (existsResult.records.length > 0) {
      return res.status(200).json({ message: 'El usuario ya está matriculado en el curso.' });
    }
      // Crear relación de matrícula
    const matriculaResult = await session.run(
      'MATCH (u:Usuario {_id: $userId}), (c:Curso {_id: $cursoId}) CREATE (u)-[:MATRICULADO_EN]->(c) RETURN u, c',
      { userId: finalUserId.toString(), cursoId: cursoId.toString() }    );
      if (matriculaResult.records.length === 0) {
      return res.status(500).json({ message: 'No se pudo crear la relación. Los nodos no existen.' });
    }
    
    res.status(201).json({ message: 'Usuario matriculado correctamente.' });} catch (error) {
    console.error('Error en matricular-usuario:', error);
    console.error('Stack trace:', (error as Error).stack);
    res.status(500).json({ 
      message: 'Error al matricular usuario', 
      error: (error as Error).message,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });  } finally {
    if (session) {
      await session.close();
    }
  }
}
