export const ansi = {
    reset: "\u001b[0m",
    red: "\u001b[31m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    lightBlue: "\u001b[94m"
};
export const colorText = (text, color) => `${color}${text}${ansi.reset}`;
//# sourceMappingURL=colors.js.map