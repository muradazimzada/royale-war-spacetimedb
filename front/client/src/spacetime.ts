import { connect } from "spacetime-db";
import * as db from "./stdb"; // generated bindings

const URL = import.meta.env.VITE_STDB_URL || "ws://127.0.0.1:3000";
const DB = import.meta.env.VITE_STDB_DB || "royale-war";

export async function initClient() {
    return await connect(db, {
        url: URL,
        db: DB,
        log: true,
    });
}
