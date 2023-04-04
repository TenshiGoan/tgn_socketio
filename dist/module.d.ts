import * as _nuxt_schema from '@nuxt/schema';

type SocketEvents = Array<{
    from: string;
    name: string;
    as?: string;
    default_export?: boolean;
}>;
type HookReturnValue = void | Promise<void>;
interface ModuleHooks {
    "tgn:socketio:events"(events: SocketEvents): HookReturnValue;
}
declare module "@nuxt/schema" {
    interface NuxtHooks extends ModuleHooks {
    }
}
interface ModuleOptions {
    strict_events: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions>;

export { ModuleHooks, ModuleOptions, SocketEvents, _default as default };
