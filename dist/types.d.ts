
import { ModuleOptions, ModuleHooks } from './module'

declare module '@nuxt/schema' {
  interface NuxtConfig { ['socketio']?: Partial<ModuleOptions> }
  interface NuxtOptions { ['socketio']?: ModuleOptions }
  interface NuxtHooks extends ModuleHooks {}
}


export { ModuleHooks, ModuleOptions, SocketEvents, default } from './module'
