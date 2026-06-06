import path from "node:path";
import { toCamelCase, toPascalCase, normalizeRelativePath, routeFileName, routeHandlerFileName, serviceFileName, moduleFileName, middlewareFileName, controllerFileName, typeFileName, specImportPath, toRoutePath } from "../utils.js";
export const controllerSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it } from "vitest";

import { ${toPascalCase(name)}Controller } from "${importPath}";

describe("${toPascalCase(name)}Controller", () => {
  it("returns the expected payload", () => {
    const controller = new ${toPascalCase(name)}Controller();
    (controller as any).${toCamelCase(name)}Service = {
      status: () => ({ resource: "${name}" })
    } as never;

    expect(controller.findAll()).toEqual({ resource: "${name}" });
  });
});
`;
};
export const serviceSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it } from "vitest";

import { ${toPascalCase(name)}Service } from "${importPath}";

describe("${toPascalCase(name)}Service", () => {
  it("can be instantiated", () => {
    expect(new ${toPascalCase(name)}Service()).toBeInstanceOf(${toPascalCase(name)}Service);
  });
});
`;
};
export const routeSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { ${toCamelCase(name)} } from "${importPath}";

describe("${toCamelCase(name)}", () => {
  it("serves the resource endpoint", async () => {
    const app = express();
    app.use(${toCamelCase(name)}.toRouter());

    await request(app)
      .get("/${toRoutePath(name)}")
      .expect(200)
      .expect({ resource: "${name}", path: "/${toRoutePath(name)}" });
  });
});
`;
};
export const middlewareSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it, vi } from "vitest";

import { ${toCamelCase(name)}Middleware } from "${importPath}";

describe("${toCamelCase(name)}Middleware", () => {
  it("calls next", () => {
    const next = vi.fn();

    ${toCamelCase(name)}Middleware({} as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
`;
};
export const createDecoratorController = (name, outputDir = "src/app/controllers") => ({
    [`${normalizeRelativePath(outputDir)}/${controllerFileName(name)}`]: `import { Controller, Get } from "@sculptor/core";

@Controller("/${name}")
export class ${toPascalCase(name)}Controller {
  @Get("/")
  findAll() {
    return { resource: "${name}" };
  }
}
`
});
export const createFunctionalControllerResource = (name) => createFunctionalArtifacts(name);
export const createFunctionalArtifacts = (name, routeDir = "src/app/routes", handlerDir = "src/app/handlers", routePrefix) => {
    const normalizedRouteDir = normalizeRelativePath(routeDir);
    const normalizedHandlerDir = normalizeRelativePath(handlerDir);
    const handlerTarget = path.posix.join(normalizedHandlerDir, routeHandlerFileName(name));
    const handlerImport = normalizeRelativePath(path.posix.relative(normalizedRouteDir, handlerTarget));
    const prefix = routePrefix ?? toRoutePath(name);
    return {
        [`${normalizedRouteDir}/${routeFileName(name)}`]: `import { FunctionalRouter } from "@sculptor/router";

import { ${toCamelCase(name)}ErrorHandler, ${toCamelCase(name)}Handler } from "${handlerImport.replace(/\.ts$/, ".js")}";

export const ${toCamelCase(name)} = FunctionalRouter("/${prefix}");

${toCamelCase(name)}.get(${toCamelCase(name)}Handler);
${toCamelCase(name)}.at("/verify").get(${toCamelCase(name)}Handler);
${toCamelCase(name)}.use(${toCamelCase(name)}ErrorHandler);
`,
        [`${normalizedHandlerDir}/${routeHandlerFileName(name)}`]: `import { normalizeError } from "@sculptor/core";
import type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError } from "@sculptor/core";

export const ${toCamelCase(name)}Handler = async (
  req: Req,
  res: Res,
  next: Nxt
): Promise<void> => {
  try {
    res.json({
      resource: "${name}",
      path: req.path
    });
  } catch (error) {
    next(normalizeError(error));
  }
};

export const ${toCamelCase(name)}ErrorHandler: FrameworkErrorHandler = (
  error: SculptorError,
  _req: Req,
  res: Res,
  next: Nxt
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error.message,
    code: error.code,
    status: error.status
  });
};
`
    };
};
export const createServiceResource = (name) => ({
    [`src/app/services/${serviceFileName(name)}`]: `import { Service } from "@sculptor/core";

@Service()
export class ${toPascalCase(name)}Service {}
`
});
export const createRepositoryResource = (name) => ({
    [`src/app/repositories/${name}.repository.ts`]: `import { Repository } from "@sculptor/core";

@Repository()
export class ${toPascalCase(name)}Repository {}
`
});
export const createFunctionalServiceResource = (name) => ({
    [`src/app/services/${serviceFileName(name)}`]: `import type { SculptorFunctionalService } from "@sculptor/core";

export const ${toCamelCase(name)}Service: SculptorFunctionalService<{ resource: string }> = () => ({
  resource: "${name}"
});
`
});
export const createFunctionalRepositoryResource = (name) => ({
    [`src/app/repositories/${name}.repository.ts`]: `import type { SculptorFunctionalRepository } from "@sculptor/core";

export const ${toCamelCase(name)}Repository: SculptorFunctionalRepository<{ resource: string }> = () => ({
  resource: "${name}"
});
`
});
export const createDtoResource = (name) => ({
    [`src/app/dtos/${name}.dto.ts`]: `export class ${toPascalCase(name)}Dto {}
`
});
export const createModuleResource = (name) => ({
    [`src/app/modules/${moduleFileName(name)}`]: `export class ${toPascalCase(name)}Module {}
`
});
export const createMiddlewareResource = (name) => ({
    [`src/app/middlewares/${middlewareFileName(name)}`]: `import type { NextFunction, Request, Response } from "express";

export const ${toCamelCase(name)}Middleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next();
};
`
});
export const createRouteResource = (name, routeDir) => {
    const normalizedRouteDir = normalizeRelativePath(routeDir);
    const normalizedHandlerDir = normalizeRelativePath(path.posix.join(path.posix.dirname(normalizedRouteDir), "handlers"));
    return createFunctionalArtifacts(name, normalizedRouteDir, normalizedHandlerDir);
};
export const createHandlerResource = (name) => ({
    [`src/app/handlers/${routeHandlerFileName(name)}`]: createFunctionalArtifacts(name)[`src/app/handlers/${routeHandlerFileName(name)}`]
});
export const createTypeResource = (name, variant, outputDir) => {
    const fileName = typeFileName(name, variant);
    const targetDir = normalizeRelativePath(outputDir);
    if (variant === "interface") {
        return {
            [`${targetDir}/${fileName}`]: `export interface ${toPascalCase(name)} {
  id?: string;
}
`
        };
    }
    if (variant === "class") {
        return {
            [`${targetDir}/${fileName}`]: `export class ${toPascalCase(name)} {}
`
        };
    }
    if (variant === "enum") {
        return {
            [`${targetDir}/${fileName}`]: `export enum ${toPascalCase(name)} {
  Default = "default"
}
`
        };
    }
    return {
        [`${targetDir}/${fileName}`]: `export type ${toPascalCase(name)} = Record<string, unknown>;
`
    };
};
export const createPackageResource = (name, outputDir, mode, options) => {
    const packageFolder = name;
    const packageRoot = normalizeRelativePath(path.posix.join(outputDir, packageFolder));
    const controllerName = `${name}.controller.ts`;
    const serviceName = `${name}.service.ts`;
    const repositoryName = `${name}.repository.ts`;
    const dtoName = `${name}.dto.ts`;
    const typesName = `${name}.types.ts`;
    const routeName = options?.routeName ?? name;
    const includeRouteArtifacts = options?.includeRouteArtifacts ?? mode !== "decorator";
    const routePrefix = options?.routePrefix ?? `${toRoutePath(routeName)}/route`;
    const routeNameFile = `${routeName}.route.ts`;
    const routeHandlerName = `${routeName}.route.handler.ts`;
    const controllerSymbol = `${toPascalCase(name)}Controller`;
    const serviceSymbol = `${toPascalCase(name)}Service`;
    const repositorySymbol = `${toPascalCase(name)}Repository`;
    const dtoSymbol = `${toPascalCase(name)}Dto`;
    const typeSymbol = `${toPascalCase(name)}Types`;
    const routeSymbol = `${toCamelCase(routeName)}`;
    const routeHandlerSymbol = `${toCamelCase(routeName)}Handler`;
    const routeErrorHandlerSymbol = `${toCamelCase(routeName)}ErrorHandler`;
    if (mode === "functional") {
        return {
            [`${packageRoot}/index.ts`]: `/**
 * @generated true
 */
import { Package, type SculptorFunctionalPackage } from "@sculptor/core";

// [sculptor:imports:start]
import { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";
import { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";
import { ${routeSymbol} } from "./${routeNameFile.replace(/\.ts$/, ".js")}";
import { ${routeHandlerSymbol} } from "./${routeHandlerName.replace(/\.ts$/, ".js")}";
// [sculptor:imports:end]

// [sculptor:exports:start]
export * from "./${serviceName.replace(/\.ts$/, ".js")}";
export * from "./${repositoryName.replace(/\.ts$/, ".js")}";
export * from "./${routeNameFile.replace(/\.ts$/, ".js")}";
export * from "./${routeHandlerName.replace(/\.ts$/, ".js")}";
export type { ${typeSymbol} } from "./${typesName.replace(/\.ts$/, ".js")}";
// [sculptor:exports:end]

// [sculptor:package:start]
const ${toPascalCase(packageFolder)}PackageDefinition = {
  name: "${packageFolder}",
  path: "${packageRoot}",
  imports: [],
  exports: [${serviceSymbol}, ${repositorySymbol}],
  controllers: [],
  handlers: [${routeHandlerSymbol}],
  services: [${serviceSymbol}],
  repositories: [${repositorySymbol}],
  middlewares: [],
  routes: [${routeSymbol}],
  customLinkedHelper: {
    class: [],
    function: []
  }
};

export const ${toPascalCase(packageFolder)}Package: SculptorFunctionalPackage = Package(${toPascalCase(packageFolder)}PackageDefinition)(() => ${toPascalCase(packageFolder)}PackageDefinition);
// [sculptor:package:end]
`,
            [`${packageRoot}/${serviceName}`]: `import type { SculptorFunctionalService } from "@sculptor/core";

export const ${serviceSymbol.charAt(0).toLowerCase() + serviceSymbol.slice(1)}: SculptorFunctionalService<{ resource: string }> = () => ({
  resource: "${name}"
});
`,
            [`${packageRoot}/${repositoryName}`]: `import type { SculptorFunctionalRepository } from "@sculptor/core";

export const ${repositorySymbol.charAt(0).toLowerCase() + repositorySymbol.slice(1)}: SculptorFunctionalRepository<{ resource: string }> = () => ({
  resource: "${name}"
});
`,
            [`${packageRoot}/${typesName}`]: `export type ${typeSymbol} = {
  resource: string;
};
`,
            [`${packageRoot}/${routeNameFile}`]: `import { FunctionalRouter } from "@sculptor/router";

import { ${routeErrorHandlerSymbol}, ${routeHandlerSymbol} } from "./${routeHandlerName.replace(/\.ts$/, ".js")}";

export const ${routeSymbol} = FunctionalRouter("/${routePrefix}");

${routeSymbol}.get(${routeHandlerSymbol});
${routeSymbol}.at("/ping").get(${routeHandlerSymbol});
${routeSymbol}.use(${routeErrorHandlerSymbol});
`,
            [`${packageRoot}/${routeHandlerName}`]: `import { normalizeError } from "@sculptor/core";
import type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError, SculptorFunctionalHandler } from "@sculptor/core";

import { ${serviceSymbol.charAt(0).toLowerCase() + serviceSymbol.slice(1)} } from "./${serviceName.replace(/\.ts$/, ".js")}";

export const ${routeHandlerSymbol}: SculptorFunctionalHandler<void> = async (
  req: Req,
  res: Res,
  next: Nxt
): Promise<void> => {
  try {
    if (req.path.endsWith("/ping")) {
      res.json({ message: "pong" });
      return;
    }

    res.json(${serviceSymbol.charAt(0).toLowerCase() + serviceSymbol.slice(1)}());
  } catch (error) {
    next(normalizeError(error));
  }
};

export const ${routeErrorHandlerSymbol}: FrameworkErrorHandler = (
  error: SculptorError,
  _req: Req,
  res: Res,
  next: Nxt
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error.message,
    code: error.code,
    status: error.status
  });
};
`
        };
    }
    if (mode === "decorator") {
        return {
            [`${packageRoot}/index.ts`]: `/**\n * @generated true\n */\nimport { Package } from "@sculptor/core";\n\n// [sculptor:imports:start]\nimport { ${controllerSymbol} } from "./${controllerName.replace(/\.ts$/, ".js")}";\nimport { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";\nimport { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";\nimport { ${dtoSymbol} } from "./${dtoName.replace(/\.ts$/, ".js")}";\n// [sculptor:imports:end]\n\n// [sculptor:exports:start]\nexport * from "./${controllerName.replace(/\.ts$/, ".js")}";\nexport * from "./${serviceName.replace(/\.ts$/, ".js")}";\nexport * from "./${repositoryName.replace(/\.ts$/, ".js")}";\nexport * from "./${dtoName.replace(/\.ts$/, ".js")}";\nexport type { ${typeSymbol} } from "./${typesName.replace(/\.ts$/, ".js")}";\n// [sculptor:exports:end]\n\n// [sculptor:package:start]\n@Package({\n  name: "${packageFolder}",\n  path: "${packageRoot}",\n  imports: [],\n  exports: [${serviceSymbol}, ${repositorySymbol}, ${dtoSymbol}],\n  controllers: [${controllerSymbol}],\n  services: [${serviceSymbol}],\n  repositories: [${repositorySymbol}],\n  middlewares: [],\n  routes: []\n})\nexport class ${toPascalCase(packageFolder)}Package {}\n// [sculptor:package:end]\n`,
            [`${packageRoot}/index.ts`]: `/**\n * @generated true\n */\nimport { Package } from "@sculptor/core";\n\n// [sculptor:imports:start]\nimport { ${controllerSymbol} } from "./${controllerName.replace(/\.ts$/, ".js")}";\nimport { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";\nimport { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";\nimport { ${dtoSymbol} } from "./${dtoName.replace(/\.ts$/, ".js")}";\n// [sculptor:imports:end]\n\n// [sculptor:exports:start]\nexport * from "./${controllerName.replace(/\.ts$/, ".js")}";\nexport * from "./${serviceName.replace(/\.ts$/, ".js")}";\nexport * from "./${repositoryName.replace(/\.ts$/, ".js")}";\nexport * from "./${dtoName.replace(/\.ts$/, ".js")}";\nexport type { ${typeSymbol} } from "./${typesName.replace(/\.ts$/, ".js")}";\n// [sculptor:exports:end]\n\n// [sculptor:package:start]\n@Package({\n  name: "${packageFolder}",\n  path: "${packageRoot}",\n  imports: [],\n  exports: [${serviceSymbol}, ${repositorySymbol}, ${dtoSymbol}],\n  controllers: [${controllerSymbol}],\n  handlers: [],\n  services: [${serviceSymbol}],\n  repositories: [${repositorySymbol}],\n  middlewares: [],\n  routes: [],\n  customLinkedHelper: {\n    class: [],\n    function: []\n  }\n})\nexport class ${toPascalCase(packageFolder)}Package {}\n// [sculptor:package:end]\n`,
            [`${packageRoot}/${controllerName}`]: `import { AutoInject, Controller, Get } from "@sculptor/core";\n\nimport { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";\n\n@Controller("/${packageFolder}")\nexport class ${controllerSymbol} {\n  @AutoInject(${serviceSymbol})\n  private readonly ${toCamelCase(name)}Service!: ${toPascalCase(name)}Service;\n\n  @Get("/")\n  findAll() {\n    return this.${toCamelCase(name)}Service.status();\n  }\n}\n`,
            [`${packageRoot}/${serviceName}`]: `import { AutoInject, Service } from "@sculptor/core";\n\nimport { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";\n\n@Service()\nexport class ${serviceSymbol} {\n  @AutoInject(${repositorySymbol})\n  private readonly ${toCamelCase(name)}Repository!: ${toPascalCase(name)}Repository;\n\n  status() {\n    return this.${toCamelCase(name)}Repository.status();\n  }\n}\n`,
            [`${packageRoot}/${repositoryName}`]: `import { Repository } from "@sculptor/core";\n\n@Repository()\nexport class ${repositorySymbol} {\n  status() {\n    return { resource: "${name}" };\n  }\n}\n`,
            [`${packageRoot}/${dtoName}`]: `export class ${dtoSymbol} {\n  resource = "${name}";\n}\n`,
            [`${packageRoot}/${typesName}`]: `export type ${typeSymbol} = {\n  status: string;\n};\n`
        };
    }
    const routeArtifacts = includeRouteArtifacts
        ? {
            [`${packageRoot}/${routeNameFile}`]: `import { FunctionalRouter } from "@sculptor/router";\n\nimport { ${routeErrorHandlerSymbol}, ${routeHandlerSymbol} } from "./${routeHandlerName.replace(/\.ts$/, ".js")}";\n\nexport const ${routeSymbol} = FunctionalRouter("/${routePrefix}");\n\n${routeSymbol}.get(${routeHandlerSymbol});\n${routeSymbol}.at("/ping").get(${routeHandlerSymbol});\n${routeSymbol}.use(${routeErrorHandlerSymbol});\n`,
            [`${packageRoot}/${routeHandlerName}`]: `import { normalizeError } from "@sculptor/core";\nimport type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError, SculptorFunctionalHandler } from "@sculptor/core";\n\nexport const ${routeHandlerSymbol}: SculptorFunctionalHandler<void> = async (\n  req: Req,\n  res: Res,\n  next: Nxt\n): Promise<void> => {\n  try {\n    res.json({\n      status: "ok",\n      resource: "${name}",\n      path: req.path\n    });\n  } catch (error) {\n    next(normalizeError(error));\n  }\n};\n\nexport const ${routeErrorHandlerSymbol}: FrameworkErrorHandler = (\n  error: SculptorError,\n  _req: Req,\n  res: Res,\n  next: Nxt\n): void => {\n  if (res.headersSent) {\n    next(error);\n    return;\n  }\n\n  res.status(500).json({\n    message: error.message,\n    code: error.code,\n    status: error.status\n  });\n};\n`
        }
        : {};
    return {
        [`${packageRoot}/index.ts`]: `/**\n * @generated true\n */\nimport { Package } from "@sculptor/core";\n\n// [sculptor:imports:start]\nimport { ${controllerSymbol} } from "./${controllerName.replace(/\.ts$/, ".js")}";\nimport { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";\nimport { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";\nimport { ${dtoSymbol} } from "./${dtoName.replace(/\.ts$/, ".js")}";\n${includeRouteArtifacts ? `import { ${routeSymbol} } from "./${routeNameFile.replace(/\.ts$/, ".js")}";\nimport { ${routeHandlerSymbol} } from "./${routeHandlerName.replace(/\.ts$/, ".js")}";\n` : ""}// [sculptor:imports:end]\n\n// [sculptor:exports:start]\nexport * from "./${controllerName.replace(/\.ts$/, ".js")}";\nexport * from "./${serviceName.replace(/\.ts$/, ".js")}";\nexport * from "./${repositoryName.replace(/\.ts$/, ".js")}";\nexport * from "./${dtoName.replace(/\.ts$/, ".js")}";\nexport type { ${typeSymbol} } from "./${typesName.replace(/\.ts$/, ".js")}";\n${includeRouteArtifacts ? `export * from "./${routeNameFile.replace(/\.ts$/, ".js")}";\nexport * from "./${routeHandlerName.replace(/\.ts$/, ".js")}";\n` : ""}// [sculptor:exports:end]\n\n// [sculptor:package:start]\n@Package({\n  name: "${packageFolder}",\n  path: "${packageRoot}",\n  imports: [],\n  exports: [${serviceSymbol}, ${repositorySymbol}, ${dtoSymbol}],\n  controllers: [${controllerSymbol}],\n  handlers: [${includeRouteArtifacts ? routeHandlerSymbol : ""}],\n  services: [${serviceSymbol}],\n  repositories: [${repositorySymbol}],\n  middlewares: [],\n  routes: [${includeRouteArtifacts ? routeSymbol : ""}],\n  customLinkedHelper: {\n    class: [],\n    function: []\n  }\n})\nexport class ${toPascalCase(packageFolder)}Package {}\n// [sculptor:package:end]\n`,
        [`${packageRoot}/${controllerName}`]: `import { AutoInject, Controller, Get } from "@sculptor/core";\n\nimport { ${serviceSymbol} } from "./${serviceName.replace(/\.ts$/, ".js")}";\n\n@Controller("/${packageFolder}")\nexport class ${controllerSymbol} {\n  @AutoInject(${serviceSymbol})\n  private readonly ${toCamelCase(name)}Service!: ${toPascalCase(name)}Service;\n\n  @Get("/")\n  findAll() {\n    return this.${toCamelCase(name)}Service.status();\n  }\n}\n`,
        [`${packageRoot}/${serviceName}`]: `import { AutoInject, Service } from "@sculptor/core";\n\nimport { ${repositorySymbol} } from "./${repositoryName.replace(/\.ts$/, ".js")}";\n\n@Service()\nexport class ${serviceSymbol} {\n  @AutoInject(${repositorySymbol})\n  private readonly ${toCamelCase(name)}Repository!: ${toPascalCase(name)}Repository;\n\n  status() {\n    return this.${toCamelCase(name)}Repository.status();\n  }\n}\n`,
        [`${packageRoot}/${repositoryName}`]: `import { Repository } from "@sculptor/core";\n\n@Repository()\nexport class ${repositorySymbol} {\n  status() {\n    return { resource: "${name}" };\n  }\n}\n`,
        [`${packageRoot}/${dtoName}`]: `export class ${dtoSymbol} {\n  resource = "${name}";\n}\n`,
        [`${packageRoot}/${typesName}`]: `export type ${typeSymbol} = {\n  status: string;\n};\n`,
        ...routeArtifacts
    };
};
//# sourceMappingURL=resources.js.map