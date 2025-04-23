import type { NextApiRequest, NextApiResponse } from "next";
import redis from "./connection/redisClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Guardar un valor de prueba
    await redis.set("test_key", "valor de prueba");
    // Leer el valor guardado
    const value = await redis.get("test_key");
    res.status(200).json({ success: true, value });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
