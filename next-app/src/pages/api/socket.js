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
