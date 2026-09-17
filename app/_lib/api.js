export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(0, "NETWORK_ERROR", error.message);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? response.statusText,
    );
  }
  return body;
}

const gamePath = (id) => `/api/v1/games/${encodeURIComponent(id)}`;

// The client only ever sends the chosen side and the month it was shown in.
export const api = {
  getCountries: () => request("/api/v1/countries"),
  // Only the country, who the player wants to be and the side taken in each campaign decision.
  createGame: (payload = {}) =>
    request("/api/v1/games", { method: "POST", body: JSON.stringify(payload) }),
  getGame: (id) => request(gamePath(id)),
  decide: (id, choice, turn) =>
    request(`${gamePath(id)}/decisions`, {
      method: "POST",
      body: JSON.stringify({ choice, turn }),
    }),
  createSuccessor: (id) => request(`${gamePath(id)}/successor`, { method: "POST", body: "{}" }),
  getChronicle: (id) => request(`${gamePath(id)}/chronicle`),
  // Only the operation, the ministry and the name. Never an effect, a loyalty or an occupant: what a
  // change costs is decided by the server and comes back in the snapshot.
  cabinetAction: (id, payload) =>
    request(`${gamePath(id)}/cabinet/actions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
