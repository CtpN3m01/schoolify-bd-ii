import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { MongoClient, ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token, secret);
    // Conectar a MongoDB y traer toda la info del usuario
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db('ProyectoIBasesII');
    const usuarios = db.collection('Usuarios');
    const usuario = await usuarios.findOne({ nombreUsuario: payload.nombreUsuario });
    client.close();
    if (!usuario) return NextResponse.json({ user: null }, { status: 200 });
    // No enviar password ni salt
    const { password, salt, ...userData } = usuario;
    // Preparar userData para respuesta, asegurando _id string
    const userDataForResponse = { ...userData, _id: userData._id?.toString?.() || userData._id };
    return NextResponse.json({ user: userDataForResponse }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
