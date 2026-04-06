import type { DMMF } from "@prisma/generator-helper";
import { extractAnnotations } from "../annotations/annotations";
import { generateTypeboxOptions } from "../annotations/options";
import { getConfig } from "../config";
import { debug } from "../debug";
import type { ProcessedModel } from "../model";
import { processedEnumsMap } from "./enum";
import { processedPlainMap } from "./plain";
import { isPrimitivePrismaFieldType } from "./primitiveField";
import { wrapWithArray } from "./wrappers/array";
import { wrapWithNullable } from "./wrappers/nullable";
import { wrapWithPartial } from "./wrappers/partial";

export const processedRelations: ProcessedModel[] = [];

export function processRelations(
  models: DMMF.Model[] | Readonly<DMMF.Model[]>,
) {
  for (const m of models) {
    const o = stringifyRelations(m);
    if (o) {
      processedRelations.push({ name: m.name, stringRepresentation: o });
    }
  }
  debug(`  relations: ${processedRelations.length} of ${models.length} models`);
  Object.freeze(processedRelations);
}

export function stringifyRelations(data: DMMF.Model) {
  const annotations = extractAnnotations(data.documentation);
  if (annotations.isHidden) return undefined;

  const fields = data.fields
    .map((field) => {
      const annotations = extractAnnotations(field.documentation);

      if (
        annotations.isHidden ||
        isPrimitivePrismaFieldType(field.type) ||
        processedEnumsMap.has(field.type)
      ) {
        return undefined;
      }

      let stringifiedType = processedPlainMap.get(
        field.type,
      )?.stringRepresentation;

      if (!stringifiedType) {
        return undefined;
      }

      if (field.isList) {
        stringifiedType = wrapWithArray(stringifiedType);
      }

      if (!field.isRequired) {
        stringifiedType = wrapWithNullable(stringifiedType);
      }

      return `${field.name}: ${stringifiedType}`;
    })
    .filter((x) => x) as string[];

  return `${getConfig().typeboxImportVariableName}.Object({${fields.join(
    ",",
  )}},${generateTypeboxOptions({ input: annotations })})\n`;
}

export const processedRelationsInputCreate: ProcessedModel[] = [];

export function processRelationsInputCreate(
  models: DMMF.Model[] | Readonly<DMMF.Model[]>,
) {
  const modelsMap = new Map<string, DMMF.Model>();
  for (const m of models) {
    modelsMap.set(m.name, m);
  }
  for (const m of models) {
    const o = stringifyRelationsInputCreate(m, modelsMap);
    if (o) {
      processedRelationsInputCreate.push({
        name: m.name,
        stringRepresentation: o,
      });
    }
  }
  Object.freeze(processedRelationsInputCreate);
}

export function stringifyRelationsInputCreate(
  data: DMMF.Model,
  allModels: Map<string, DMMF.Model>,
) {
  const annotations = extractAnnotations(data.documentation);
  if (
    annotations.isHidden ||
    annotations.isHiddenInput ||
    annotations.isHiddenInputCreate
  )
    return undefined;

  const fields = data.fields
    .map((field) => {
      const annotations = extractAnnotations(field.documentation);

      if (
        annotations.isHidden ||
        annotations.isHiddenInput ||
        annotations.isHiddenInputCreate ||
        isPrimitivePrismaFieldType(field.type) ||
        processedEnumsMap.has(field.type)
      ) {
        return undefined;
      }

      let typeboxIdType = "String";

      const relatedIdType = allModels
        .get(field.type)
        ?.fields.find((f) => f.isId)?.type;

      switch (relatedIdType) {
        case "String":
          typeboxIdType = "String";
          break;
        case "Int":
          typeboxIdType = "Integer";
          break;
        case "BigInt":
          typeboxIdType = "Integer";
          break;
        default:
          debug(
            `  skipping ${data.name}.${field.name} -> ${field.type} (no simple @id)`,
          );
          return undefined;
      }

      let connectString = `${getConfig().typeboxImportVariableName}.Object({
				id: ${
          getConfig().typeboxImportVariableName
        }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })}),
			},${generateTypeboxOptions({ input: annotations })})`;

      if (field.isList) {
        connectString = wrapWithArray(connectString);
      }

      let stringifiedType = `${getConfig().typeboxImportVariableName}.Object({
				connect: ${connectString},
			}, ${generateTypeboxOptions()})`;

      if (!field.isRequired || field.isList) {
        stringifiedType = `${
          getConfig().typeboxImportVariableName
        }.Optional(${stringifiedType})`;
      }

      return `${field.name}: ${stringifiedType}`;
    })
    .filter((x) => x) as string[];

  return `${getConfig().typeboxImportVariableName}.Object({${fields.join(
    ",",
  )}},${generateTypeboxOptions({ input: annotations })})\n`;
}

export const processedRelationsInputUpdate: ProcessedModel[] = [];

export function processRelationsInputUpdate(
  models: DMMF.Model[] | Readonly<DMMF.Model[]>,
) {
  const modelsMap = new Map<string, DMMF.Model>();
  for (const m of models) {
    modelsMap.set(m.name, m);
  }
  for (const m of models) {
    const o = stringifyRelationsInputUpdate(m, modelsMap);
    if (o) {
      processedRelationsInputUpdate.push({
        name: m.name,
        stringRepresentation: o,
      });
    }
  }
  Object.freeze(processedRelationsInputUpdate);
}

export function stringifyRelationsInputUpdate(
  data: DMMF.Model,
  allModels: Map<string, DMMF.Model>,
) {
  const annotations = extractAnnotations(data.documentation);
  if (
    annotations.isHidden ||
    annotations.isHiddenInput ||
    annotations.isHiddenInputUpdate
  )
    return undefined;

  const fields = data.fields
    .map((field) => {
      const annotations = extractAnnotations(field.documentation);

      if (
        annotations.isHidden ||
        annotations.isHiddenInput ||
        annotations.isHiddenInputUpdate ||
        isPrimitivePrismaFieldType(field.type) ||
        processedEnumsMap.has(field.type)
      ) {
        return undefined;
      }

      let typeboxIdType = "String";

      const relatedIdType = allModels
        .get(field.type)
        ?.fields.find((f) => f.isId)?.type;

      switch (relatedIdType) {
        case "String":
          typeboxIdType = "String";
          break;
        case "Int":
          typeboxIdType = "Integer";
          break;
        case "BigInt":
          typeboxIdType = "Integer";
          break;
        default:
          debug(
            `  skipping ${data.name}.${field.name} -> ${field.type} (no simple @id)`,
          );
          return undefined;
      }

      let stringifiedType: string;

      if (field.isList) {
        stringifiedType = wrapWithPartial(`${
          getConfig().typeboxImportVariableName
        }.Object({
						connect: ${wrapWithArray(`${getConfig().typeboxImportVariableName}.Object({
								id: ${
                  getConfig().typeboxImportVariableName
                }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })})
							}, ${generateTypeboxOptions({ input: annotations })})`)},
						disconnect: ${wrapWithArray(`${getConfig().typeboxImportVariableName}.Object({
								id: ${
                  getConfig().typeboxImportVariableName
                }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })})
							}, ${generateTypeboxOptions({ input: annotations })})`)}
					}, ${generateTypeboxOptions({ input: annotations })})`);
      } else {
        if (field.isRequired) {
          stringifiedType = `${getConfig().typeboxImportVariableName}.Object({
						connect: ${getConfig().typeboxImportVariableName}.Object({
							id: ${
                getConfig().typeboxImportVariableName
              }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })})
						}, ${generateTypeboxOptions({ input: annotations })})
					}, ${generateTypeboxOptions({ input: annotations })})`;
        } else {
          stringifiedType = wrapWithPartial(`${
            getConfig().typeboxImportVariableName
          }.Object({
						connect: ${getConfig().typeboxImportVariableName}.Object({
							id: ${
                getConfig().typeboxImportVariableName
              }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })})
						}, ${generateTypeboxOptions({ input: annotations })}),
						disconnect: ${getConfig().typeboxImportVariableName}.Boolean()
					}, ${generateTypeboxOptions({ input: annotations })})`);
        }
      }

      return `${field.name}: ${stringifiedType}`;
    })
    .filter((x) => x) as string[];

  return wrapWithPartial(
    `${getConfig().typeboxImportVariableName}.Object({${fields.join(
      ",",
    )}},${generateTypeboxOptions({ input: annotations })})`,
  );
}
