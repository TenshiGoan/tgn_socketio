import { addPluginTemplate, defineNuxtModule, createResolver, installModule, updateTemplates, addTemplate } from '@nuxt/kit';
import { globbySync } from 'globby';
import { addNitroImport } from '@tgn/utils';
import lodash from 'lodash';
import FS from 'fs';

function addSocketPlugin() {
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
        `});`
      ].join("\n");
    }
  });
}

const module = defineNuxtModule({
  meta: {
    name: "@tgn/socketio",
    configKey: "socketio"
  },
  defaults: {
    strict_events: true,
    events_dir: "events",
    types_file: "$types.ts"
  },
  setup(options, nuxt) {
    const resolve = createResolver(import.meta.url).resolve;
    const events_dir = resolve(nuxt.options.srcDir, options.events_dir);
    const types_file = resolve(events_dir, options.types_file);
    nuxt.options.alias["#tgn_socketio_runtime"] = resolve("runtime");
    nuxt.options.watch.push(events_dir);
    installModule("@tgn/virtual-entry");
    addSocketPlugin();
    addNitroImport("useSocketIO", "#tgn_socketio_runtime/useSocketIO");
    const restartNitro = lodash.debounce(updateTemplates, 500);
    nuxt.hook("builder:watch", (event, path) => {
      if (event === "change")
        return;
      const fullpath = resolve(nuxt.options.srcDir, path);
      if (fullpath.startsWith(events_dir)) {
        restartNitro();
      }
    });
    nuxt.hook("tgn:socketio:events", (events) => {
      const files = globbySync("**/**.ts", {
        cwd: events_dir
      });
      for (const file of files) {
        const from = resolve(events_dir, file);
        if (from.startsWith(types_file)) {
          continue;
        }
        const name = file.slice(0, -3).replaceAll("\\", "/");
        events.push({ name, from, default_export: true });
      }
    });
    async function getEvents() {
      const events = [];
      await nuxt.callHook("tgn:socketio:events", events);
      return events;
    }
    addTemplate({
      filename: "tgn/socketio/types.ts",
      write: true,
      async getContents(data) {
        const events = await getEvents();
        const imports = [];
        const events_lines = [];
        const server_events_lines = [];
        for (const event of events) {
          const name = event.as ?? event.name;
          const field = event.default_export ?? true ? "default" : event.name;
          const from = event.from.endsWith(".ts") ? event.from.slice(0, -3) : event.from;
          events_lines.push(
            `  ["${name}"]: Awaited<typeof import("${from}")>["${field}"];`
          );
        }
        if (options.strict_events === false) {
          events_lines.push(`  [name: string]: (...args: any[]) => void;`);
        }
        server_events_lines.push(`  test: (value :number) => void;`);
        if (await fileExist(types_file)) {
          imports.push(
            `import { ServerEvents as BaseServerEvents } from "${types_file.slice(
              0,
              -3
            )}";`
          );
        } else {
          imports.push("type BaseServerEvents = {};");
        }
        return [
          //
          ...imports,
          `export type Events = {`,
          ...events_lines,
          `}`,
          ``,
          `export type ServerEvents = BaseServerEvents & {`,
          ...server_events_lines,
          `}`
        ].join("\n");
      }
    });
    nuxt.hook("tgn:virtual-entry:source", async (source) => {
      const events = await getEvents();
      const events_lines = [];
      events_lines.push(`const TGN_SOCKETIO_EVENTS = {`);
      for (const event of events) {
        const name = event.as ?? event.name;
        const var_name = "TGN_SOCKETIO_EVENT_" + name.replaceAll("/", "__");
        if (event.default_export ?? true) {
          source.headers.push(`import ${var_name} from "${event.from}";`);
        } else {
          source.headers.push(
            `import { ${event.name} as ${var_name} } from "${event.from}";`
          );
        }
        events_lines.push(`  ["${name}"]: ${var_name},`);
      }
      events_lines.push(`};`);
      source.headers.push(
        `import { createSocketServer } from "#tgn_socketio_runtime/server";`
      );
      source.body.push(
        ...events_lines,
        `createSocketServer(server, TGN_SOCKETIO_EVENTS);`,
        `console.log(TGN_SOCKETIO_EVENTS);`
      );
    });
  }
});
function fileExist(path) {
  return new Promise((resolve) => {
    FS.access(path, (err) => resolve(!err));
  });
}

export { module as default };
