/**
 * Future provider surface.
 *
 * This extension currently relies on schema-driven IntelliSense and the docs tree
 * provider, but this folder is reserved for future hover, completion, and language
 * feature providers without forcing a redesign later.
 */

export interface ProviderRegistration {
  readonly id: string;
  dispose(): void;
}
