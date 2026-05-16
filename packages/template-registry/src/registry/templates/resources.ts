import path from "node:path";

import type { TypeVariant } from "../utils.js";
import {
  toCamelCase,
  toPascalCase,
  normalizeRelativePath,
  routeFileName,
  routeHandlerFileName,
  serviceFileName,
  moduleFileName,
  middlewareFileName,
  controllerFileName,
  typeFileName,
  specImportPath,
  toRoutePath
} from "../utils.js";

export const controllerSpecTemplate = (name: string, sourcePath: string): string => {
  const importPath = specImportPath(sourcePath);
  return `import { describe, expect, it } from "vitest";

import { ${toPascalCase(name)}Controller } from "${importPath}";

describe("${toPascalCase(name)}Controller", () => {
  it("returns the expected payload", () => {
    const controller = new ${toPascalCase(name)}Controller();

    expect(controller.findAll()).toEqual({ resource: "${name}" });
  });
});
`;
};

export const serviceSpecTemplate = (name: string, sourcePath: string): string => {
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

export const routeSpecTemplate = (name: string, sourcePath: string): string => {
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

export const middlewareSpecTemplate = (name: string, sourcePath: string): string => {
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

export const createDecoratorController = (
  name: string,
  outputDir = "src/app/controllers"
): Record<string, string> => ({
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

export const createFunctionalArtifacts = (
  name: string,
  routeDir = "src/app/routes",
  handlerDir = "src/app/handlers"
): Record<string, string> => {
  const normalizedRouteDir = normalizeRelativePath(routeDir);
  const normalizedHandlerDir = normalizeRelativePath(handlerDir);
  const handlerTarget = path.posix.join(normalizedHandlerDir, routeHandlerFileName(name));
  const handlerImport = normalizeRelativePath(path.posix.relative(normalizedRouteDir, handlerTarget));

  return {
    [`${normalizedRouteDir}/${routeFileName(name)}`]: `import { FunctionalRouter } from "@sculptor/router";

import { ${toCamelCase(name)}ErrorHandler, ${toCamelCase(name)}Handler } from "${handlerImport.replace(/\.ts$/, ".js")}";

export const ${toCamelCase(name)} = FunctionalRouter("/${toRoutePath(name)}");

${toCamelCase(name)}.get(${toCamelCase(name)}Handler);
${toCamelCase(name)}.at("/verify").get(${toCamelCase(name)}Handler);
${toCamelCase(name)}.use(${toCamelCase(name)}ErrorHandler);
`,
    [`${normalizedHandlerDir}/${routeHandlerFileName(name)}`]: `import type { Err, Nxt, Req, Res } from "@sculptor/core";

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
  } catch (error: unknown) {
    next(error);
  }
};

export const ${toCamelCase(name)}ErrorHandler: Err = (
  error: unknown,
  _req: Req,
  res: Res,
  next: Nxt
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error instanceof Error ? error.message : "Internal Server Error"
  });
};
`
  };
};

export const createServiceResource = (name: string): Record<string, string> => ({
  [`src/app/services/${serviceFileName(name)}`]: `export class ${toPascalCase(name)}Service {}
`
});

export const createModuleResource = (name: string): Record<string, string> => ({
  [`src/app/modules/${moduleFileName(name)}`]: `export class ${toPascalCase(name)}Module {}
`
});

export const createMiddlewareResource = (name: string): Record<string, string> => ({
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

export const createRouteResource = (name: string, routeDir: string): Record<string, string> => {
  const normalizedRouteDir = normalizeRelativePath(routeDir);
  const normalizedHandlerDir = normalizeRelativePath(path.posix.join(path.posix.dirname(normalizedRouteDir), "handlers"));

  return createFunctionalArtifacts(name, normalizedRouteDir, normalizedHandlerDir);
};

export const createHandlerResource = (name: string): Record<string, string> => ({
  [`src/app/handlers/${routeHandlerFileName(name)}`]:
    createFunctionalArtifacts(name)[`src/app/handlers/${routeHandlerFileName(name)}`]
});

export const createTypeResource = (
  name: string,
  variant: TypeVariant,
  outputDir: string
): Record<string, string> => {
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
