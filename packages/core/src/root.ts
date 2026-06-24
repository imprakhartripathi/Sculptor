import fs from "node:fs";
import path from "node:path";

export const findAppRoot = (startPath: string): string => {
  let current = path.resolve(startPath);

  for (;;) {
    if (fs.existsSync(path.join(current, "sculptor.json"))) {
      return current;
    }

    if (fs.existsSync(path.join(current, "props.json"))) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return process.cwd();
    }

    current = parent;
  }
};

export const resolveRootDir = (rootDir?: string): string =>
  rootDir ?? process.env.SCULPTOR_ROOT_DIR ?? findAppRoot(process.cwd());
