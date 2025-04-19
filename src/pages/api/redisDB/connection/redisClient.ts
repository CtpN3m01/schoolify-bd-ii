import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_MASTER_HOST,
  port: Number(process.env.REDIS_MASTER_PORT),
});

redis.on("connect", () => {
  console.log("Conectado a Redis (master)");
});

redis.on("error", (err) => {
  console.error("Error conectando a Redis:", err);
});

export default redis;
