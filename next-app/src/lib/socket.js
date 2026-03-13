import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

// Global socket.io instance to share across routes
let io;

export function getIO() {
  return io;
}

export function initIO(server) {
  if (!io) {
    io = new SocketIOServer(server, {
      path: "/api/socket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }
  return io;
}

export function broadcastStaffStatusChange(staffId, status, staffData) {
  if (io) {
    io.emit("staffStatusChange", {
      staffId,
      status,
      staffData,
      timestamp: Date.now(),
    });
  }
}

export function broadcastActiveCountChange(count) {
  if (io) {
    io.emit("activeCountChange", { count, timestamp: Date.now() });
  }
}
