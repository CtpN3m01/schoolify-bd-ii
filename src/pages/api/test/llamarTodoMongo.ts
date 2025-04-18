import { NextApiRequest, NextApiResponse } from 'next';

const { client, connectMongoDB } = require('../mongoDB/connection/conector-mongoDB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed, only GET requests are accepted' });
  }
  
  try {
    // Connect to MongoDB
    await connectMongoDB();
    const database = client.db("basesPrueba");
    const collection = database.collection("basesPruebaCollection");

    // Find all documents in the collection
    const documents = await collection.find({}).toArray();

    // Return the documents
    return res.status(200).json({ 
      success: true, 
      data: documents,
      count: documents.length 
    });

  } catch (error) {
    console.error("Error in API route:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data from MongoDB',
      details: errorMessage
    });  } finally {
    // Ensure the client closes when the operation is complete
    await client.close();
  }
}
