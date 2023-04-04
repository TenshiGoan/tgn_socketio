/// <reference types="node" />
import { type Server as HttpServer } from "node:http";
export declare function createSocketServer(http_server: HttpServer, events: Record<string, Function>): void;
