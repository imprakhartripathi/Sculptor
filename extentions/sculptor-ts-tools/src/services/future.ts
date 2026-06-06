export interface LanguageServerIntegrationService {
  readonly kind: "language-server";
  attach(): Promise<void>;
}

export interface DecoratorNavigationService {
  readonly kind: "decorator-navigation";
  findDecoratorTargets(): Promise<void>;
}

export interface DependencyInjectionAwarenessService {
  readonly kind: "dependency-injection-awareness";
  inspectPackageGraph(): Promise<void>;
}

export interface GenerationBridgeService {
  readonly kind: "generation-bridge";
  generateController(): Promise<void>;
  generateService(): Promise<void>;
  generateRepository(): Promise<void>;
}

export class NoopLanguageServerIntegrationService implements LanguageServerIntegrationService {
  readonly kind = "language-server" as const;

  async attach(): Promise<void> {
    return undefined;
  }
}

export class NoopDecoratorNavigationService implements DecoratorNavigationService {
  readonly kind = "decorator-navigation" as const;

  async findDecoratorTargets(): Promise<void> {
    return undefined;
  }
}

export class NoopDependencyInjectionAwarenessService implements DependencyInjectionAwarenessService {
  readonly kind = "dependency-injection-awareness" as const;

  async inspectPackageGraph(): Promise<void> {
    return undefined;
  }
}

export class NoopGenerationBridgeService implements GenerationBridgeService {
  readonly kind = "generation-bridge" as const;

  async generateController(): Promise<void> {
    return undefined;
  }

  async generateService(): Promise<void> {
    return undefined;
  }

  async generateRepository(): Promise<void> {
    return undefined;
  }
}
