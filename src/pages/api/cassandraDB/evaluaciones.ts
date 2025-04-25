import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { connectCassandra } from './connection/connector-cassandraDB';

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
    }
    return;
  }
  if (req.method === 'POST' && req.query.responder === '1') {
    // Responder evaluación
    const { idEvaluacion, idEstudiante, respuestas, preguntas } = req.body;
    // Calcular calificación
    let correctas = 0;
    for (let i = 0; i < preguntas.length; i++) {
      let pregunta = preguntas[i];
      if (typeof pregunta === 'string') {
        try { pregunta = JSON.parse(pregunta); } catch {}
      }
      if (respuestas[i] === pregunta.respuestaCorrecta) correctas++;
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
  }
  if (req.method === 'GET' && req.query.resultados === '1') {
    // Resultados de estudiante para un curso
    const { idEstudiante, idCurso } = req.query;
    try {
      const evals = await client.execute('SELECT id FROM evaluaciones WHERE idcurso = ?', [idCurso], { prepare: true });
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
  }
  res.status(405).json({ error: 'Método o parámetros no soportados' });
}
