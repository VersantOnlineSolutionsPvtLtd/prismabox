import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { generateBarrelFile } from "./barrel";
import { getConfig } from "./config";
import { debug, timedAsync } from "./debug";
import { mapAllModelsForWrite } from "./model";

const execFileAsync = promisify(execFile);

async function findBiome(): Promise<string | undefined> {
  // Try local node_modules/.bin first, then PATH
  const localBin = join("node_modules", ".bin", "biome");
  try {
    await access(localBin);
    return localBin;
  } catch {}

  // Try resolving from this package's location
  try {
    const pkgBin = join(__dirname, "..", "node_modules", ".bin", "biome");
    await access(pkgBin);
    return pkgBin;
  } catch {}

  return undefined;
}

export async function write() {
  const mappings = Array.from(mapAllModelsForWrite().entries());
  debug(`write: ${mappings.length} files`);

  for (let i = 0; i < mappings.length; i++) {
    const [name, content] = mappings[i];
    debug(`  [${i + 1}/${mappings.length}] ${name}.ts`);
    await writeFile(join(getConfig().output, `${name}.ts`), content);
  }

  debug("writing barrel.ts");
  await writeFile(
    join(getConfig().output, "barrel.ts"),
    generateBarrelFile(mappings.map(([key]) => key)),
  );

  if (!getConfig().disableFormatting) {
    const biomeBin = await findBiome();
    if (biomeBin) {
      await timedAsync("biome format", async () => {
        await execFileAsync(biomeBin, ["format", "--write", getConfig().output]);
      });
    } else {
      debug("biome not found, skipping formatting");
    }
  }
}
