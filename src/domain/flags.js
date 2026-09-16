export function isFlagActive(flags, key) {
  if (!Object.hasOwn(flags, key)) return false;
  const { value } = flags[key];
  return value !== false && value !== null && value !== undefined;
}

// Removals run before sets so a choice can reset a flag explicitly.
export function applyFlagOperations(flags, { setFlags = [], removeFlags = [] }, turn) {
  const next = { ...flags };
  const changes = [];

  for (const key of removeFlags) {
    if (!Object.hasOwn(next, key)) continue;
    changes.push({ type: "removed", key, previousValue: next[key].value, label: next[key].label });
    delete next[key];
  }

  for (const definition of setFlags) {
    const previous = Object.hasOwn(next, definition.key) ? next[definition.key] : null;
    const expiresAtTurn =
      definition.expiresAfterTurns == null ? null : turn + definition.expiresAfterTurns;

    next[definition.key] = {
      value: definition.value,
      label: definition.label,
      legacy: definition.legacy,
      legacyPriority: definition.legacyPriority,
      successorEffects: definition.successorEffects,
      setAtTurn: turn,
      expiresAtTurn,
      inherited: false,
    };

    changes.push({
      type: "set",
      key: definition.key,
      value: definition.value,
      previousValue: previous ? previous.value : null,
      expiresAtTurn,
      legacy: definition.legacy,
      label: definition.label,
    });
  }

  return { flags: next, changes };
}

// GDD §13.3: a flag expiring at turn N is removed before the card of turn N is selected.
export function expireFlags(flags, turn) {
  const expired = Object.keys(flags)
    .filter((key) => flags[key].expiresAtTurn != null && flags[key].expiresAtTurn <= turn)
    .sort();

  if (expired.length === 0) return { flags, expired };

  const next = { ...flags };
  for (const key of expired) delete next[key];

  return { flags: next, expired };
}
