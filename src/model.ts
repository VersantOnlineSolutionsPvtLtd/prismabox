import { getConfig } from "./config";
import { processedEnums } from "./generators/enum";
import { processedInclude } from "./generators/include";
import { processedOrderBy } from "./generators/orderBy";
import { processedPlain, processedPlainMap } from "./generators/plain";
import { processedPlainInputCreate } from "./generators/plainInputCreate";
import { processedPlainInputUpdate } from "./generators/plainInputUpdate";
import {
  processedRelations,
  processedRelationsInputCreate,
  processedRelationsInputUpdate,
} from "./generators/relations";
import { processedSelect } from "./generators/select";
import {
  transformDateImportStatement,
  transformDateType,
} from "./generators/transformDate";
import { processedWhere, processedWhereUnique } from "./generators/where";
import { makeComposite } from "./generators/wrappers/composite";
import { nullableImport, nullableType } from "./generators/wrappers/nullable";

export type ProcessedModel = {
  name: string;
  stringRepresentation: string;
};

function convertModelToStandalone(
  input: Pick<ProcessedModel, "name" | "stringRepresentation">,
) {
  return `export const ${getConfig().exportedTypePrefix}${input.name} = ${input.stringRepresentation}\n`;
}

function typepoxImportStatement() {
  return `import { ${getConfig().typeboxImportVariableName} } from "${
    getConfig().typeboxImportDependencyName
  }"\n`;
}

export function mapAllModelsForWrite() {
  const modelsPerName = new Map<
    ProcessedModel["name"],
    ProcessedModel["stringRepresentation"]
  >();

  const process = (models: ProcessedModel[], suffix: string) => {
    for (const processedModel of models) {
      const standalone = convertModelToStandalone({
        ...processedModel,
        name: `${processedModel.name}${suffix}`,
      });
      const current = modelsPerName.get(processedModel.name);
      if (current) {
        modelsPerName.set(processedModel.name, `${current}\n${standalone}`);
      } else {
        modelsPerName.set(processedModel.name, standalone);
      }
    }
  };

  process(processedEnums, "");
  process(processedPlain, "Plain");
  process(processedRelations, "Relations");
  process(processedPlainInputCreate, "PlainInputCreate");
  process(processedPlainInputUpdate, "PlainInputUpdate");
  process(processedRelationsInputCreate, "RelationsInputCreate");
  process(processedRelationsInputUpdate, "RelationsInputUpdate");
  process(processedWhere, "Where");
  process(processedWhereUnique, "WhereUnique");
  process(processedSelect, "Select");
  process(processedInclude, "Include");
  process(processedOrderBy, "OrderBy");

  const relationsSet = new Set(processedRelations.map((e) => e.name));
  const relationsInputCreateSet = new Set(
    processedRelationsInputCreate.map((e) => e.name),
  );
  const relationsInputUpdateSet = new Set(
    processedRelationsInputUpdate.map((e) => e.name),
  );

  for (const [key, value] of modelsPerName) {
    const hasPlain = processedPlainMap.has(key);
    const hasRelations = relationsSet.has(key);
    let composite: string;
    if (hasPlain && hasRelations) {
      composite = makeComposite([`${key}Plain`, `${key}Relations`]);
    } else if (hasPlain) {
      composite = `${key}Plain`;
    } else if (hasRelations) {
      composite = `${key}Relations`;
    } else {
      continue;
    }

    modelsPerName.set(
      key,
      `${value}\n${convertModelToStandalone({
        name: key,
        stringRepresentation: composite,
      })}`,
    );
  }

  for (const [key, value] of modelsPerName) {
    if (relationsInputCreateSet.has(key)) {
      const composite = makeComposite([
        `${key}PlainInputCreate`,
        `${key}RelationsInputCreate`,
      ]);
      modelsPerName.set(
        key,
        `${value}\n${convertModelToStandalone({
          name: `${key}InputCreate`,
          stringRepresentation: composite,
        })}`,
      );
    }
  }

  for (const [key, value] of modelsPerName) {
    if (relationsInputUpdateSet.has(key)) {
      const composite = makeComposite([
        `${key}PlainInputUpdate`,
        `${key}RelationsInputUpdate`,
      ]);
      modelsPerName.set(
        key,
        `${value}\n${convertModelToStandalone({
          name: `${key}InputUpdate`,
          stringRepresentation: composite,
        })}`,
      );
    }
  }

  for (const [key, value] of modelsPerName) {
    modelsPerName.set(
      key,
      `${typepoxImportStatement()}\n${transformDateImportStatement()}\n${nullableImport()}\n${value}`,
    );
  }

  modelsPerName.set(getConfig().nullableName, nullableType());
  modelsPerName.set(getConfig().transformDateName, transformDateType());

  return modelsPerName;
}
