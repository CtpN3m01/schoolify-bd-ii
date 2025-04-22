import { NextApiRequest, NextApiResponse } from 'next';
import { connectCassandra, client } from '../../api/cassandraDB/connection/connector-cassandraDB';
import { types } from 'cassandra-driver';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectCassandra(); // Ensure connection is ready

  try {
    // 1. Create Test
    if (req.method === 'POST') {
      const test = { id: types.Uuid.random(), ...req.body };

      await client.execute(
        `INSERT INTO schoolify.tests (
          id, name, professor, course, start_date, end_date, grade, questions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          test.id,
          test.name,
          test.professor,
          test.course,
          test.start_date,
          test.end_date,
          test.grade,
          test.questions
        ],
        { prepare: true }
      );

      return res.status(201).json({ success: true, id: test.id });
    }

    // 2. GET - by course OR id
    if (req.method === 'GET') {
      const { course, id } = req.query;

      // If ID is present, return single test
      if (id && typeof id === 'string') {
        const result = await client.execute(
          'SELECT * FROM schoolify.tests WHERE id = ?',
          [types.Uuid.fromString(id)],
          { prepare: true }
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Test not found' });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      // If course is present, return all tests in course
      if (course && typeof course === 'string') {
        const result = await client.execute(
          `SELECT id, name, course, start_date, end_date, professor, grade
           FROM schoolify.tests WHERE course = ? ALLOW FILTERING`,
          [course],
          { prepare: true }
        );

        return res.status(200).json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });
      }

      return res.status(400).json({ success: false, error: 'Missing course or id query parameter' });
    }

    // Unsupported method
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
