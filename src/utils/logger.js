const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };

function resolveLevel(env = process.env) {
  const configured = env.LOG_LEVEL?.toLowerCase();
  if (configured && Object.hasOwn(LEVELS, configured)) return configured;
  return env.NODE_ENV === "test" ? "silent" : "info";
}

// Errors are reduced to name/code/message so stacks and internals never end up in log lines.
function serialize(context) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) =>
      value instanceof Error
        ? [key, { name: value.name, code: value.code, message: value.message }]
        : [key, value],
    ),
  );
}

function writeToConsole(level, line) {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger({
  level = resolveLevel(),
  write = writeToConsole,
  now = () => new Date(),
} = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const log = (entryLevel, message, context = {}) => {
    if (LEVELS[entryLevel] < threshold) return;
    const entry = {
      timestamp: now().toISOString(),
      level: entryLevel,
      message,
      ...serialize(context),
    };
    write(entryLevel, JSON.stringify(entry));
  };

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}

export const logger = createLogger();
