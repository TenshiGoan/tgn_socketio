import {
  defineNuxtModule,
  installModule,
  createResolver,
  updateTemplates,
  addTemplate,
} from "@nuxt/kit";
import { globbySync } from "globby";
import { addNitroImport } from "@tgn/utils";
import lodash from "lodash";
import FS from "fs";

import { addSocketPlugin } from "./base/plugin";

export type SocketEvents = Array<{
  from: string;
  name: string;
  as?: string;
  default_export?: boolean;
}>;

type HookReturnValue = void | Promise<void>;

export interface ModuleHooks {
  "tgn:socketio:events"(events: SocketEvents): HookReturnValue;
}

declare module "@nuxt/schema" {
  interface NuxtHooks extends ModuleHooks {}
}

export interface ModuleOptions {
  strict_events: boolean;
  events_dir: string;
  types_file: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@tgn/socketio",
    configKey: "socketio",
  },
  defaults: {
    strict_events: true,
    events_dir: "events",
    types_file: "$types.ts",
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
      if (event === "change") return;
      const fullpath = resolve(nuxt.options.srcDir, path);
      if (fullpath.startsWith(events_dir)) {
        restartNitro();
      }
    });

    nuxt.hook("tgn:socketio:events", (events) => {
      const files = globbySync("**/**.ts", {
        cwd: events_dir,
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
      const events: SocketEvents = [];
      await nuxt.callHook("tgn:socketio:events", events);
      return events;
    }

    addTemplate({
      filename: "tgn/socketio/types.ts",
      write: true,
      async getContents(data) {
        const events = await getEvents();
        const imports: string[] = [];
        const events_lines: string[] = [];
        const server_events_lines: string[] = [];
        for (const event of events) {
          const name = event.as ?? event.name;
          const field = event.default_export ?? true ? "default" : event.name;
          const from = event.from.endsWith(".ts")
            ? event.from.slice(0, -3)
            : event.from;
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
          `}`,
        ].join("\n");
      },
    });

    nuxt.hook("tgn:virtual-entry:source", async (source) => {
      const events = await getEvents();
      const events_lines: string[] = [];

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
        //
        ...events_lines,
        `createSocketServer(server, TGN_SOCKETIO_EVENTS);`,
        `console.log(TGN_SOCKETIO_EVENTS);`
      );
    });
  },
});

function fileExist(path: string) {
  return new Promise<boolean>((resolve) => {
    FS.access(path, (err) => resolve(!err));
  });
}
