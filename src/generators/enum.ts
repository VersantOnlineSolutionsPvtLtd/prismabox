import type { DMMF } from "@prisma/generator-helper";
import { extractAnnotations } from "../annotations/annotations";
import { generateTypeboxOptions } from "../annotations/options";
import { getConfig } from "../config";
import { debug } from "../debug";
import type { ProcessedModel } from "../model";
import { makeUnion } from "./wrappers/union";

export const processedEnums: ProcessedModel[] = [];
export const processedEnumsMap = new Map<string, ProcessedModel>();

export function processEnums(
  enums: DMMF.DatamodelEnum[] | Readonly<DMMF.DatamodelEnum[]>,
) {
  for (const e of enums) {
    const stringRepresentation = stringifyEnum(e);
    if (stringRepresentation) {
      const model = { name: e.name, stringRepresentation };
      processedEnums.push(model);
      processedEnumsMap.set(e.name, model);
    }
  }
  debug(`  enums: ${processedEnums.length} processed`);
  Object.freeze(processedEnums);
}

export function stringifyEnum(data: DMMF.DatamodelEnum) {
  const annotations = extractAnnotations(data.documentation);
  if (annotations.isHidden) return undefined;

  const variantsString = data.values.map(
    (v) => `${getConfig().typeboxImportVariableName}.Literal('${v.name}')`,
  );

  return makeUnion(
    variantsString,
    generateTypeboxOptions({ input: annotations }),
  );
}
