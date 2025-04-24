import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((res.socket as any).server.io) {
    res.end();
    return;
  }
  const io = new Server((res.socket as any).server, {
    path: "/api/socket_io",
    addTrailingSlash: false,
    cors: {
      origin: "*"
    }
  });
  (res.socket as any).server.io = io;

  io.on("connection", (socket) => {
    socket.on("send-message", (msg) => {
      io.to(msg.to).emit("receive-message", msg);
    });
    socket.on("join", (userId) => {
      socket.join(userId);
    });
  });
  res.end();
}
