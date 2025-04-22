import { connectCassandra } from './connector-cassandraDB';
import { types, Client } from 'cassandra-driver';

// ==========================
// Insertar un nuevo Test
// ==========================
async function insertTest(client: Client): Promise<{ testId: types.Uuid; questionId: types.Uuid }> {
  const testId = types.Uuid.random();

  const query = `
    INSERT INTO schoolify.tests (
      id, professor, course, start_date, end_date, grade, questions
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const questionId = types.Uuid.random();

  const params = [
    testId,
    'Dr. Amanda',
    'Bases de Datos II',
    new Date('2025-04-20'),
    new Date('2025-04-25'),
    100.0,
    [
      {
        id: questionId,
        description: '¿Qué es Cassandra?',
        answers: [
          { description: 'Una base de datos NoSQL distribuida', is_correct: true },
          { description: 'Un lenguaje de programación', is_correct: false }
        ]
      }
    ]
  ];

  await client.execute(query, params, { prepare: true });
  console.log('Test insertado');
  return { testId, questionId };
}

// ==========================
// Insertar ejecución de test
// ==========================
async function insertExecutedTest(client: Client, testId: types.Uuid, questionId: types.Uuid): Promise<types.Uuid> {
  const executedTestId = types.Uuid.random();

  const query = `
    INSERT INTO schoolify.executed_tests (
      id, test_id, student, grade, execution_date, answers
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    executedTestId,
    testId,
    'Amanda Ramírez',
    95.0,
    new Date('2025-04-22'),
    [
      {
        question_id: questionId,
        answer: 'Una base de datos NoSQL distribuida',
        is_correct: true
      }
    ]
  ];

  await client.execute(query, params, { prepare: true });
  console.log('ExecutedTest insertado');
  return executedTestId;
}

// ==========================
// Consultas individuales
// ==========================
async function getTestById(client: Client, id: types.Uuid) {
  const result = await client.execute('SELECT * FROM schoolify.tests WHERE id = ?', [id], { prepare: true });
  console.log('Resultado Test por ID:');
  console.dir(result.rows[0], { depth: null });
}

async function getExecutedTestById(client: Client, id: types.Uuid) {
  const result = await client.execute('SELECT * FROM schoolify.executed_tests WHERE id = ?', [id], { prepare: true });
  console.log('Resultado ExecutedTest por ID:');
  console.dir(result.rows[0], { depth: null });
}

// ==========================
// Consultas generales
// ==========================
async function getAllTests(client: Client) {
  const result = await client.execute('SELECT * FROM schoolify.tests');
  console.log('Todos los Tests:');
  console.dir(result.rows, { depth: null });
}

async function getAllExecutedTests(client: Client) {
  const result = await client.execute('SELECT * FROM schoolify.executed_tests');
  console.log('Todos los ExecutedTests:');
  console.dir(result.rows, { depth: null });
}

// ==========================
// Función principal
// ==========================
async function start() {
  const client = await connectCassandra();
  const { testId, questionId } = await insertTest(client);
  const executedTestId = await insertExecutedTest(client, testId, questionId);

  await getTestById(client, testId);
  await getExecutedTestById(client, executedTestId);

  await getAllTests(client);
  await getAllExecutedTests(client);
}

start();
