import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { connectCassandra } from './connection/connector-cassandraDB';
import { ObjectId } from 'mongodb';

// Utilidades para fechas
const now = () => new Date().toISOString();

// Estructura de tablas esperada en Cassandra:
// evaluaciones (id UUID PRIMARY KEY, idcurso TEXT, nombre TEXT, fechainicio TIMESTAMP, fechafin TIMESTAMP, preguntas LIST<FROZEN<MAP<TEXT, TEXT>>>)
// respuestas (idevaluacion UUID, idestudiante TEXT, respuestas LIST<INT>, calificacion FLOAT, fecharealizada TIMESTAMP, PRIMARY KEY (idevaluacion, idestudiante))

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await connectCassandra();
  if (req.method === 'POST' && req.query.crear === '1') {
    // Crear evaluación
    const { idCurso, nombre, fechaInicio, fechaFin, preguntas } = req.body;
    const id = uuidv4();
    try {
      // Serializar cada pregunta como string JSON
      const preguntasSerializadas = (preguntas || []).map((p: any) => JSON.stringify(p));
      await client.execute(
        'INSERT INTO evaluaciones (id, idcurso, nombre, fechainicio, fechafin, preguntas) VALUES (?, ?, ?, ?, ?, ?)',
        [id, idCurso, nombre, fechaInicio, fechaFin, preguntasSerializadas],
        { prepare: true }
      );
      res.status(200).json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: 'Error al crear evaluación', details: e });
    }
    return;
  }
  if (req.method === 'GET' && req.query.curso) {
    // Listar evaluaciones de un curso
    const { curso } = req.query;
    try {
      // IMPORTANTE: Cassandra requiere ALLOW FILTERING si no hay índice secundario
      const result = await client.execute('SELECT * FROM evaluaciones WHERE idcurso = ? ALLOW FILTERING', [curso], { prepare: true });
      // Parsear preguntas de string a objeto
      const evaluaciones = result.rows.map((ev: any) => ({
        ...ev,
        preguntas: (ev.preguntas || []).map((p: string) => {
          try { return JSON.parse(p); } catch { return p; }
        })
      }));
      res.status(200).json({ ok: true, evaluaciones });
    } catch (e) {
      res.status(500).json({ error: 'Error al listar evaluaciones', details: e });
    }    return;
  }
  if (req.method === 'PUT' && req.query.editar === '1') {
    // Editar evaluación
    const { id, idCurso, nombre, fechaInicio, fechaFin, preguntas } = req.body;
    try {
      // Serializar cada pregunta como string JSON
      const preguntasSerializadas = (preguntas || []).map((p: any) => JSON.stringify(p));
      await client.execute(
        'UPDATE evaluaciones SET nombre = ?, fechainicio = ?, fechafin = ?, preguntas = ? WHERE id = ?',
        [nombre, fechaInicio, fechaFin, preguntasSerializadas, id],
        { prepare: true }
      );
      res.status(200).json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: 'Error al editar evaluación', details: e });
    }
    return;
  }
  if (req.method === 'DELETE' && req.query.eliminar === '1') {
    // Eliminar evaluación
    const { id } = req.query;
    try {
      await client.execute('DELETE FROM evaluaciones WHERE id = ?', [id], { prepare: true });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar evaluación', details: e });
    }
    return;
  }  if (req.method === 'POST' && req.query.responder === '1') {
    // Responder evaluación
    const { idEvaluacion, idEstudiante, respuestas, preguntas } = req.body;
    // Calcular calificación
    let correctas = 0;
    for (let i = 0; i < preguntas.length; i++) {
      let pregunta = preguntas[i];
      if (typeof pregunta === 'string') {
        try { pregunta = JSON.parse(pregunta); } catch {}
      }
      // Si no hay respuesta (undefined, null, -1) se considera como fallada
      const respuestaEstudiante = respuestas[i];
      if (respuestaEstudiante !== undefined && respuestaEstudiante !== null && respuestaEstudiante !== -1) {
        if (respuestaEstudiante === pregunta.respuestaCorrecta) correctas++;
      }
      // Si no hay respuesta, no se incrementa 'correctas', por lo que se cuenta como fallada
    }
    const calificacion = (correctas / preguntas.length) * 100;
    try {
      await client.execute(
        'INSERT INTO respuestas (idevaluacion, idestudiante, respuestas, calificacion, fecharealizada) VALUES (?, ?, ?, ?, ?)',
        [idEvaluacion, idEstudiante, respuestas, calificacion, now()],
        { prepare: true }
      );
      res.status(200).json({ ok: true, calificacion });
    } catch (e) {
      res.status(500).json({ error: 'Error al guardar respuesta', details: e });
    }
    return;
  }if (req.method === 'GET' && req.query.resultados === '1') {
    // Resultados de estudiante para un curso
    const { idEstudiante, idCurso } = req.query;
    try {
      const evals = await client.execute('SELECT id FROM evaluaciones WHERE idcurso = ? ALLOW FILTERING', [idCurso], { prepare: true });
      const ids = evals.rows.map((r: any) => r.id);
      let resultados: any[] = [];
      for (const id of ids) {
        const r = await client.execute('SELECT * FROM respuestas WHERE idevaluacion = ? AND idestudiante = ?', [id, idEstudiante], { prepare: true });
        if (r.rows.length > 0) resultados.push({ ...r.rows[0], idevaluacion: id });
      }
      res.status(200).json({ ok: true, resultados });
    } catch (e) {
      res.status(500).json({ error: 'Error al obtener resultados', details: e });
    }
    return;
  }  if (req.method === 'GET' && req.query.resultadosEvaluacion === '1') {
    // Resultados de todos los estudiantes para una evaluación específica
    const { idEvaluacion } = req.query;
    try {
      const resultados = await client.execute('SELECT * FROM respuestas WHERE idevaluacion = ?', [idEvaluacion], { prepare: true });
      
      // Obtener información de estudiantes desde MongoDB
      const estudiantesIds = resultados.rows.map((r: any) => r.idestudiante);
      let estudiantesInfo: any = {};
      
      if (estudiantesIds.length > 0) {
        try {
          const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');
          const mongoClient = await connectMongoDB();
          const db = mongoClient.db("ProyectoIBasesII");
          const usuarios = db.collection('Usuarios');
          
          const objectIds = estudiantesIds.map((id: string) => new ObjectId(id));
          const usuariosResult = await usuarios.find({ _id: { $in: objectIds } }).toArray();
          
          usuariosResult.forEach((usuario: any) => {
            estudiantesInfo[usuario._id.toString()] = `${usuario.nombre} ${usuario.apellido1} ${usuario.apellido2}`.trim();
          });
        } catch (mongoError) {
          console.error('Error al obtener información de estudiantes:', mongoError);
        }
      }

      // Agregar nombre completo a los resultados
      const resultadosConNombres = resultados.rows.map((resultado: any) => ({
        ...resultado,
        nombreCompleto: estudiantesInfo[resultado.idestudiante] || `Usuario ${resultado.idestudiante}`
      }));
      
      res.status(200).json({ ok: true, resultados: resultadosConNombres });
    } catch (e) {
      res.status(500).json({ error: 'Error al obtener resultados de evaluación', details: e });
    }
    return;
  }  if (req.method === 'GET' && req.query.resultadosCurso === '1') {
    // Obtener todos los resultados de evaluaciones para un curso específico
    const { cursoId } = req.query;
    try {
      // Primero obtener todas las evaluaciones del curso
      const evaluaciones = await client.execute('SELECT id FROM evaluaciones WHERE idcurso = ? ALLOW FILTERING', [cursoId], { prepare: true });
      const evaluacionesIds = evaluaciones.rows.map((r: any) => r.id);
      
      let todosLosResultados: any[] = [];
      
      // Para cada evaluación, obtener todos los resultados
      for (const evalId of evaluacionesIds) {
        const resultados = await client.execute('SELECT * FROM respuestas WHERE idevaluacion = ?', [evalId], { prepare: true });
        todosLosResultados.push(...resultados.rows);
      }
      
      // Obtener información de estudiantes desde MongoDB
      const estudiantesIds = [...new Set(todosLosResultados.map((r: any) => r.idestudiante))];
      let estudiantesInfo: any = {};
      
      if (estudiantesIds.length > 0) {
        try {
          const { connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');
          const mongoClient = await connectMongoDB();
          const db = mongoClient.db("ProyectoIBasesII");
          const usuarios = db.collection('Usuarios');
          
          const objectIds = estudiantesIds.map((id: string) => new ObjectId(id));
          const usuariosResult = await usuarios.find({ _id: { $in: objectIds } }).toArray();
          
          usuariosResult.forEach((usuario: any) => {
            estudiantesInfo[usuario._id.toString()] = `${usuario.nombre} ${usuario.apellido1} ${usuario.apellido2}`.trim();
          });
        } catch (mongoError) {
          console.error('Error al obtener información de estudiantes:', mongoError);
        }
      }

      // Agregar nombre completo a los resultados
      const resultadosConNombres = todosLosResultados.map((resultado: any) => ({
        ...resultado,
        nombreCompleto: estudiantesInfo[resultado.idestudiante] || `Usuario ${resultado.idestudiante}`
      }));
      
      res.status(200).json({ ok: true, resultados: resultadosConNombres });
    } catch (e) {
      res.status(500).json({ error: 'Error al obtener resultados del curso', details: e });
    }
    return;
  }
  res.status(405).json({ error: 'Método o parámetros no soportados' });
}
