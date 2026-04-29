import { colorText, ansi } from "./internal/colors.js";
import { formatMessage } from "./internal/format.js";
import { resolveLoggingConfig } from "./internal/config.js";
const dogLabels = {
    log: { prefix: "[ Coki ]", prefixColor: "green" },
    system: { prefix: "[ Coki ]", prefixColor: "lightBlue" },
    warn: { prefix: "[ Bruno ]", fullLineColor: "yellow" },
    error: { prefix: "[ Dodie ]", fullLineColor: "red" }
};
const standardLabels = {
    log: { prefix: "[Log]", prefixColor: "green" },
    system: { prefix: "[System]", prefixColor: "lightBlue" },
    warn: { prefix: "[Warning]", fullLineColor: "yellow" },
    error: { prefix: "[Error]", fullLineColor: "red" }
};
const bootLines = [
    "Booting Application - Bruno, Coki & Dodie are active and aware.",
    "[ Bruno ] : Hello Developer, I am Bruno, I will help you by warning you about any unexpected thing that happens in the code",
    "[ Coki ] : Hi Dev! I am Coki, I am your companion through this development journey, I will log everything that the system does",
    "[ Dodie ] : Sup Dudes! I'm your Dawg Dodie, I'll bark at you if something goes wrong, Woof!!"
];
const getRenderSpec = (mode, level) => mode === "dog" ? dogLabels[level] : standardLabels[level];
const applyColors = (message, spec) => {
    if (spec.fullLineColor) {
        return colorText(`${spec.prefix} : ${message}`, ansi[spec.fullLineColor]);
    }
    if (spec.prefixColor) {
        return `${colorText(spec.prefix, ansi[spec.prefixColor])} : ${message}`;
    }
    return `${spec.prefix} : ${message}`;
};
const renderLine = (mode, level, values) => {
    const spec = getRenderSpec(mode, level);
    return applyColors(formatMessage(values), spec);
};
const emit = (level, values) => {
    const config = resolveLoggingConfig();
    if (!config.enabled) {
        return;
    }
    console.log(renderLine(config.dogMode ? "dog" : "standard", level, values));
};
let booted = false;
export const paws = {
    boot() {
        const config = resolveLoggingConfig();
        if (!config.enabled || !config.dogMode || booted) {
            return;
        }
        booted = true;
        for (const line of bootLines) {
            console.log(line);
        }
    },
    log: ((...values) => {
        emit("log", values);
    }),
    system: ((...values) => {
        emit("system", values);
    }),
    warn: ((...values) => {
        emit("warn", values);
    }),
    error: ((...values) => {
        emit("error", values);
    })
};
//# sourceMappingURL=paws.js.map