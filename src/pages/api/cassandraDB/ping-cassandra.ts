import type { NextApiRequest, NextApiResponse } from 'next';
import { connectCassandra } from './connection/connector-cassandraDB';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectCassandra();
    res.status(200).json({ success: true, message: 'Conexión a Cassandra exitosa.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al conectar a Cassandra', error: (error as Error).message });
  }
}
