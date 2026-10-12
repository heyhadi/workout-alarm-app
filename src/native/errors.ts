/**
 * Error thrown when a Kotlin native module is not linked.
 *
 * Milestone 1 ships the TypeScript API surface first; the Kotlin bridges
 * land via `npx expo prebuild` + the config plugins in `plugins/`.
 * Until then every call fails fast with a clear, actionable message
 * instead of a cryptic `undefined is not a function`.
 */
export class NativeBridgeNotAvailableError extends Error {
  readonly moduleName: string;

  constructor(moduleName: string) {
    super(
      `[${moduleName}] native module is not linked. ` +
        'Run `npx expo prebuild`, ensure the config plugins in `plugins/` applied, ' +
        'and rebuild with an EAS development build (never Expo Go).',
    );
    this.name = 'NativeBridgeNotAvailableError';
    this.moduleName = moduleName;
  }
}
