import { access, mkdir, rm } from "node:fs/promises";
import { generatorHandler } from "@prisma/generator-helper";
import { getConfig, setConfig } from "./config";
import { debug, timed, timedAsync } from "./debug";
import { processEnums } from "./generators/enum";
import { processInclude } from "./generators/include";
import { processOrderBy } from "./generators/orderBy";
import { processPlain } from "./generators/plain";
import { processPlainInputCreate } from "./generators/plainInputCreate";
import { processPlainInputUpdate } from "./generators/plainInputUpdate";
import {
  processRelations,
  processRelationsInputCreate,
  processRelationsInputUpdate,
} from "./generators/relations";
import { processSelect } from "./generators/select";
import { processWhere, processWhereUnique } from "./generators/where";
import { write } from "./writer";

generatorHandler({
  onManifest() {
    return {
      defaultOutput: "./prismabox",
      prettyName: "prismabox",
    };
  },
  async onGenerate(options) {
    setConfig({
      ...options.generator.config,
      // for some reason, the output is an object with a value key
      output: options.generator.output?.value,
    });

    const models = options.dmmf.datamodel.models;
    const enums = options.dmmf.datamodel.enums;
    debug(`output: ${getConfig().output}`);
    debug(`models: ${models.length}, enums: ${enums.length}`);
    debug(`inputModel: ${getConfig().inputModel}`);

    try {
      await access(getConfig().output);
      await rm(getConfig().output, { recursive: true });
    } catch (_error) {}

    await mkdir(getConfig().output, { recursive: true });

    timed(`processEnums: ${enums.length} enums`, () => processEnums(enums));
    timed(`processPlain: ${models.length} models`, () => processPlain(models));
    timed("processRelations", () => processRelations(models));
    timed("processWhere", () => processWhere(models));
    timed("processWhereUnique", () => processWhereUnique(models));
    if (getConfig().inputModel) {
      timed("processPlainInputCreate", () => processPlainInputCreate(models));
      timed("processPlainInputUpdate", () => processPlainInputUpdate(models));
      timed("processRelationsInputCreate", () =>
        processRelationsInputCreate(models),
      );
      timed("processRelationsInputUpdate", () =>
        processRelationsInputUpdate(models),
      );
    }
    timed("processSelect", () => processSelect(models));
    timed("processInclude", () => processInclude(models));
    timed("processOrderBy", () => processOrderBy(models));

    await timedAsync("write (format + disk)", () => write());

    debug("generation complete");
  },
});
