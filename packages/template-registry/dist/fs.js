import fs from "node:fs";
import path from "node:path";
export const ensureDir = (dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
};
export const writeTextFile = (filePath, content) => {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf8");
};
//# sourceMappingURL=fs.js.map