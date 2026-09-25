import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("src/prompts");
const destination = resolve("dist/prompts");

mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
