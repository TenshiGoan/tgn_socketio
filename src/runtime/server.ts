import { type Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { event_ctx } from "./useSocketIO";

export function createSocketServer(
  http_server: HttpServer,
  events: Record<string, Function>
) {
  const socket_server = new SocketServer(http_server);

  socket_server.on("connection", (socket) => {
    console.log(`[${socket.id}]: connection`);
    socket.on("disconnect", () => {
      console.log(`[${socket.id}]: disconnect`);
    });
    socket.onAny((event_name, ...args: any[]) => {
      const func = events[event_name];
      if (!func) {
        console.log(`Unknown event: ${event_name}`);
        return;
      }
      event_ctx.call(
        {
          socket,
          server: socket_server,
        },
        () => {
          try {
            func(...args);
          } catch (err) {
            console.error(err);
          }
        }
      );
    });
  });
}
