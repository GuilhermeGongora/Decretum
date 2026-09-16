// Local storage keeps only preferences and the current government id (GDD §25).
const PREFERENCES_KEY = "decretum.preferences";
const GAME_ID_KEY = "decretum.currentGameId";

const DEFAULT_PREFERENCES = Object.freeze({
  exactEffects: false,
  reducedMotion: false,
  tutorialSeen: false,
});

const listeners = new Set();
const memory = new Map();
let cachedPreferences = { raw: undefined, value: DEFAULT_PREFERENCES };

function readItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeItem(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
  }
  for (const listener of listeners) listener();
}

export function subscribeStorage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPreferences() {
  const raw = readItem(PREFERENCES_KEY);
  if (raw !== cachedPreferences.raw) {
    let parsed = {};
    try {
      parsed = JSON.parse(raw ?? "{}");
    } catch {
      parsed = {};
    }
    cachedPreferences = { raw, value: { ...DEFAULT_PREFERENCES, ...parsed } };
  }
  return cachedPreferences.value;
}

export function getServerPreferences() {
  return DEFAULT_PREFERENCES;
}

export function updatePreferences(patch) {
  writeItem(PREFERENCES_KEY, JSON.stringify({ ...getPreferences(), ...patch }));
}

export function readSavedGameId() {
  return readItem(GAME_ID_KEY);
}

// Undefined on the server means "not known yet", distinct from "no saved government".
export function readServerGameId() {
  return undefined;
}

export function saveGameId(id) {
  writeItem(GAME_ID_KEY, id);
}

export function clearSavedGameId() {
  writeItem(GAME_ID_KEY, null);
}
