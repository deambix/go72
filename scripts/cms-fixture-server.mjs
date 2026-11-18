
import http from "node:http";
import {memoryBlob} from "./blob-fixture.mjs";
import {createRepository} from "../server/storage.js";
import {createHandler} from "../server/handler.js";
if(!process.env.ADMIN_PUBLISH_KEY)throw new Error("Test key required");
const adapter=memoryBlob(),repo=createRepository(adapter);
await repo.load();
http.createServer(createHandler(repo,adapter)).listen(4180,"127.0.0.1");
