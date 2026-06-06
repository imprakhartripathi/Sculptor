#!/usr/bin/env node
import { runCli } from "../dist/index.js";

void runCli().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
