import { getPool } from "@/src/database/pool";

export function routeContext(id) {
  return { params: Promise.resolve({ id }) };
}

export function postRequest(path, body) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function getRequest(path) {
  return new Request(`http://localhost${path}`);
}

// Test-only SQL used to put a government in a specific state.
export function queryTestDatabase(text, params = []) {
  return getPool().query(text, params);
}
