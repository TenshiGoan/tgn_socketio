import type { Socket, Server } from "socket.io";
export type EventCtx = {
    socket: Socket;
    server: Server;
};
export declare const event_ctx: import("unctx").UseContext<EventCtx>;
export declare const useSocketIO: () => EventCtx;
