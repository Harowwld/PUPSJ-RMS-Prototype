import { Server } from "socket.io";

// Track active admin sockets for targeted updates
let io;

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (res.socket.server.io) {
    res.end("Socket.io server already running");
    return;
  }

  io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("adminSubscribe", () => {
      socket.join("admins");
      console.log("Admin subscribed:", socket.id);
    });

    socket.on("pairSubscribe", (sessionIdRaw) => {
      const sessionId = Number(sessionIdRaw);
      if (!Number.isFinite(sessionId)) return;
      socket.join(`pair:${sessionId}`);
    });

    socket.on("pairUnsubscribe", (sessionIdRaw) => {
      const sessionId = Number(sessionIdRaw);
      if (!Number.isFinite(sessionId)) return;
      socket.leave(`pair:${sessionId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  res.end("Socket.io server started");
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Export function to broadcast to admins
export function broadcastToAdmins(event, data) {
  if (io) {
    io.to("admins").emit(event, data);
  }
}

export function broadcastToPairSession(sessionId, event, data) {
  if (!io) return;
  const id = Number(sessionId);
  if (!Number.isFinite(id)) return;
  io.to(`pair:${id}`).emit(event, data);
}
