export const ansi = {
  reset: "\u001b[0m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  lightBlue: "\u001b[94m"
} as const;

export type AnsiColor = (typeof ansi)[keyof typeof ansi];

export const colorText = (text: string, color: AnsiColor): string =>
  `${color}${text}${ansi.reset}`;
