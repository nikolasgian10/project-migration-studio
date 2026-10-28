import type { DataStore } from "./types";
import { createLocalStore } from "./local.server";
import { createSharePointStore } from "./sharepoint.server";
import { hashPassword } from "../password";

let store: DataStore | undefined;

/** QDAS_DATA_SOURCE=sharepoint usa o SharePoint; qualquer outro valor usa o arquivo local. */
export function getStore(): DataStore {
  if (!store) {
    store = process.env.QDAS_DATA_SOURCE === "sharepoint"
      ? createSharePointStore()
      : createLocalStore(async () => ({ name: "Nikolas Souza", np: "37051650", admin: true, password_hash: await hashPassword("2912") }));
  }
  return store;
}
