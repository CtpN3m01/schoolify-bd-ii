import { NextApiRequest, NextApiResponse } from 'next';
import { connectCassandra, client } from '../../api/cassandraDB/connection/connector-cassandraDB';

import { types } from 'cassandra-driver';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectCassandra();

  try {
    // POST - Create Executed Test
    if (req.method === 'POST') {
      const { test_id, student, answers } = req.body;

      if (!test_id || !student || !answers) {
        return res.status(400).json({ success: false, error: 'Missing test_id, student or answers' });
      }

      const testResult = await client.execute(
        'SELECT * FROM schoolify.tests WHERE id = ?',
        [types.Uuid.fromString(test_id)],
        { prepare: true }
      );

      const test = testResult.rows[0];
      if (!test) return res.status(404).json({ error: 'Test not found' });

      const questionList = test.questions;
      let correct = 0;

      for (const answer of answers) {
        const question = questionList.find((q: any) => q.id.toString() === answer.question_id);
        const correctAnswer = question?.answers.find((a: any) => a.is_correct)?.description;
        answer.is_correct = answer.answer === correctAnswer;
        if (answer.is_correct) correct++;
      }

      const perQuestion = test.grade / questionList.length;
      const grade = correct * perQuestion;
      const execId = types.Uuid.random();

      await client.execute(
        `INSERT INTO schoolify.executed_tests (
          id, test_id, student, grade, execution_date, answers
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          execId,
          test_id,
          student,
          grade,
          new Date(),
          answers
        ],
        { prepare: true }
      );

      return res.status(201).json({ success: true, id: execId, grade });
    }

    // GET - List by course and student
    if (req.method === 'GET') {
      const { course, student } = req.query;
      if (!course || !student) {
        return res.status(400).json({ success: false, error: 'Missing course or student' });
      }

      const execs = await client.execute(
        'SELECT * FROM schoolify.executed_tests WHERE student = ? ALLOW FILTERING',
        [student],
        { prepare: true }
      );

      const filtered = [];

      for (const row of execs.rows) {
        const testRes = await client.execute(
          'SELECT id, name, course FROM schoolify.tests WHERE id = ?',
          [row.test_id],
          { prepare: true }
        );

        const test = testRes.rows[0];
        if (test && test.course === course) {
          filtered.push({
            id: row.id,
            name: test.name,
            execution_date: row.execution_date,
            grade: row.grade
          });
        }
      }

      return res.status(200).json({ success: true, data: filtered, count: filtered.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
