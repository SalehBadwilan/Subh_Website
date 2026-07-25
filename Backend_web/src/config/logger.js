/**
 * Logger — tiny wrapper around console for now.
 * Kept as a module so we can swap in a real logger (pino/winston) later
 * without touching every file.
 */
const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
  debug: (...args) => {
    if (!isProd) console.debug('[debug]', ...args);
  },
};

export default logger;
