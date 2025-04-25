// cassandra.ts
import { Client } from 'cassandra-driver';
import dotenv from 'dotenv';

dotenv.config();

const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '').split(',').filter(Boolean);
const localDataCenter = process.env.CASSANDRA_DATACENTER; //default value
const keyspace = process.env.CASSANDRA_KEYSPACE; //database name

// Crear una instancia del cliente de Cassandra
const client = new Client({
  contactPoints: contactPoints,
  localDataCenter: localDataCenter,
  keyspace: keyspace,
});

async function connectCassandra() {
  try {
    await client.connect();
    console.log('Connected successfully to Cassandra');
    return client;
  } catch (error) {
    console.error('Error connecting to Cassandra:', error);
    throw error;
  }
}

export { client, connectCassandra };
