import { readFileSync } from "node:fs";
import { join } from "node:path";

const LUA_DIR = join(__dirname, "..", "lua");

export const readLuaScript = (name: string): string =>
  readFileSync(join(LUA_DIR, `${name}.lua`), "utf8");
