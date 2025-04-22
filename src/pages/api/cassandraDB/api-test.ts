import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/cassandraDB';

async function testCreateTest() {
  const response = await axios.post(`${BASE_URL}/tests`, {
    name: 'Evaluación de Cassandra',
    professor: '1',
    course: '1',
    start_date: '2025-04-20',
    end_date: '2025-04-25',
    grade: 10,
    questions: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        description: '¿Qué es Cassandra?',
        answers: [
          { description: 'Una base de datos NoSQL distribuida', is_correct: true },
          { description: 'Un lenguaje de programación', is_correct: false }
        ]
      }
    ]
  });

  console.log('Test creado:', response.data);
  return response.data.id;
}

async function testListTestsByCourse(course: string) {
  const response = await axios.get(`${BASE_URL}/tests`, {
    params: { course }
  });

  console.log(`Tests para el curso "${course}":`, response.data);
}

async function testGetTest(id: string) {
  const response = await axios.get(`${BASE_URL}/tests`, {
    params: { id }
  });

  console.log(JSON.stringify(response.data, null, 2));
}

async function testCreateExecutedTest(testId: string, questionId: string) {
  const response = await axios.post(`${BASE_URL}/executed-tests`, {
    test_id: testId,
    student: '1',
    answers: [
      {
        question_id: questionId,
        answer: 'Una base de datos NoSQL distribuida'
      }
    ]
  });

  console.log('ExecutedTest creado:', response.data);
  return response.data.id;
}

async function testListExecutedTestByCourse(course: string, student: string) {
  const response = await axios.get(`${BASE_URL}/executed-tests`, {
    params: { course, student }
  });

  console.log(`Tests ejecutados por ${student} en ${course}:`, response.data);
}

async function runAll() {
  try {
    const testId = await testCreateTest();

    const questionId = '123e4567-e89b-12d3-a456-426614174000';

    await testListTestsByCourse('1');
    await testGetTest(testId);
    const executedId = await testCreateExecutedTest(testId, questionId);
    await testListExecutedTestByCourse('1', '1');

  } catch (error) {
    console.error('Error en las pruebas:', error);
  }
}

runAll();
