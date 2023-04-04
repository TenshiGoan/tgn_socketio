import { getContext } from "unctx";
export const event_ctx = getContext("TGN:SOCKETIO:EVENTCTX");
export const useSocketIO = event_ctx.use;
