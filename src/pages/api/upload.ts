import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm({
    uploadDir: 'E:/Servidor-Archivos',
    keepExtensions: true
  });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error al subir archivo' });
    const fileData = files.file;
    const file = Array.isArray(fileData) ? fileData[0] : fileData;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `http://26.110.167.142:8080/Servidor-Archivos/${file.newFilename}`;
    return res.status(200).json({ url });
  });
}