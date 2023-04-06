import { addPluginTemplate } from "@nuxt/kit";

export function addSocketPlugin() {
  addPluginTemplate({
    filename: "tgn/socketio/plugin.client.ts",
    write: true,
    mode: "client",
    getContents() {
      return [
        `import { defineNuxtPlugin } from "#app";`,
        `import type { ServerEvents, Events } from "#build/tgn/socketio/types";`,
        `import { type Socket, io as createSocket } from "socket.io-client";`,
        ``,
        `export default defineNuxtPlugin((nuxtApp) => {`,
        `  const io: Socket<ServerEvents, Events> = createSocket({});`,
        ``,
        `  //if (process.client && process.dev) {`,
        `  //@ts-ignore`,
        `  window.$io = io;`,
        `  //}`,
        ``,
        `  return { provide: { io } };`,
        `});`,
      ].join("\n");
    },
  });
}
