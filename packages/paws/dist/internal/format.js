import { inspect } from "node:util";
const inspectOptions = {
    depth: null,
    colors: false,
    breakLength: Infinity,
    compact: true,
    sorted: false
};
export const formatValue = (value) => {
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof Error) {
        return value.stack ?? value.message;
    }
    return inspect(value, inspectOptions);
};
export const formatMessage = (values) => values.length === 0 ? "" : values.map(formatValue).join(" ");
//# sourceMappingURL=format.js.map