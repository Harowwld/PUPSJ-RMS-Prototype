export default function handler(req, res) {
  res.status(404).end("Socket server disabled");
}

export function broadcastToAdmins(event, data) {
  // No-op stub to prevent import failures in other server files
}
