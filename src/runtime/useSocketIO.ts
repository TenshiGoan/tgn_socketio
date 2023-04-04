import { getContext } from "unctx";
import type { Socket, Server } from "socket.io";

export type EventCtx = {
  socket: Socket;
  server: Server;
};

export const event_ctx = getContext<EventCtx>("TGN:SOCKETIO:EVENTCTX");

export const useSocketIO = event_ctx.use;
