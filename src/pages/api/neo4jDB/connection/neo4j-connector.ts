import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

let driver: Driver;

function connectNeo4j() {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driver;
}

async function verifyConnection() {
  try {
    const session = connectNeo4j().session();
    await session.run('RETURN 1');
    await session.close();
    console.log('Conexión exitosa a Neo4j');
  } catch (error) {
    console.error('Error conectando a Neo4j:', error);
    throw error;
  }
}

export { connectNeo4j, verifyConnection, driver };