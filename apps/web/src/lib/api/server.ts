import "server-only";
import { createResources } from "./resources";
import { serverRequest } from "./http.server";

export const serverApi = createResources(serverRequest);
