import fs from "fs";

import path from "path";

import util from "util";

import minimatch from "minimatch";

import glob from "glob";

import debug from "../debug";

import { assert, assertAndReturn, assertIsString } from "../assertions";

import {
  isString,
  isStringOrFalse,
  isStringOrStringArray,
} from "../type-guards";

import { ensureIsAbsolute } from "../path-helpers";

function isStringEntry(entry: [any, any]): entry is [string, string] {
  return typeof entry[0] === "string" && typeof entry[1] === "string";
}

/**
 * This is obviously a non-exhaustive list.
 *
 * Definitions can found in https://github.com/cypress-io/cypress/blob/develop/cli/schema/cypress.schema.json.
 */
export interface ICypressPre10Configuration {
  projectRoot: string;
  integrationFolder: string;
  fixturesFolder: string | false;
  supportFile: string | false;
  testFiles: string | string[];
  ignoreTestFiles: string | string[];
  env: Record<string, any>;
}

function validateConfigurationEntry(
  key: string,
  value: unknown
): Partial<ICypressPre10Configuration> {
  switch (key) {
    case "projectRoot":
      if (!isString(value)) {
        throw new Error(
          `Expected a string (projectRoot), but got ${util.inspect(value)}`
        );
      }
      return { [key]: value };
    case "integrationFolder":
      if (!isString(value)) {
        throw new Error(
          `Expected a string (integrationFolder), but got ${util.inspect(
            value
          )}`
        );
      }
      return { [key]: value };
    case "fixturesFolder":
      if (!isStringOrFalse(value)) {
        throw new Error(
          `Expected a string or false (fixturesFolder), but got ${util.inspect(
            value
          )}`
        );
      }
      return { [key]: value };
    case "supportFile":
      if (!isStringOrFalse(value)) {
        throw new Error(
          `Expected a string or false (supportFile), but got ${util.inspect(
            value
          )}`
        );
      }
      return { [key]: value };
    case "testFiles":
      if (!isStringOrStringArray(value)) {
        throw new Error(
          `Expected a string or array of strings (testFiles), but got ${util.inspect(
            value
          )}`
        );
      }
      return { [key]: value };
    case "ignoreTestFiles":
      if (!isStringOrStringArray(value)) {
        throw new Error(
          `Expected a string or array of strings (ignoreTestFiles), but got ${util.inspect(
            value
          )}`
        );
      }
      return { [key]: value };
    default:
      return {};
  }
}

function parseJsonFile(filepath: string) {
  const content = fs.readFileSync(filepath).toString("utf8");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Malformed ${filepath}, expected JSON`);
  }
}

function findLastIndex<T>(
  collection: ArrayLike<T>,
  predicate: (value: T) => boolean,
  beforeIndex = collection.length
): number {
  for (let i = beforeIndex - 1; i >= 0; --i) {
    if (predicate(collection[i])) {
      return i;
    }
  }

  return -1;
}

function* traverseArgvMatching(
  argv: string[],
  name: string,
  allowEqual: boolean
) {
  let beforeIndex = argv.length,
    matchingIndex;

  while (
    (matchingIndex = findLastIndex(
      argv,
      (arg) => arg.startsWith(name),
      beforeIndex
    )) !== -1
  ) {
    if (argv[matchingIndex] === name) {
      if (argv.length - 1 === matchingIndex) {
        debug(`'${name}' argument missing`);
      } else {
        yield argv[matchingIndex + 1];
      }
    } else if (allowEqual && argv[matchingIndex][name.length] === "=") {
      yield argv[matchingIndex].slice(name.length + 1);
    }

    beforeIndex = matchingIndex;
  }
}

function* combine<T>(...generators: Generator<T, unknown, unknown>[]) {
  for (const generator of generators) {
    yield* generator;
  }
}

function findArgumentValue(
  argv: string[],
  name: string,
  allowEqual: boolean
): string | undefined {
  for (const value of traverseArgvMatching(argv, name, allowEqual)) {
    return value;
  }
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function capitalize(word: string) {
  return word.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function toCamelCase(value: string) {
  return value
    .split("_")
    .map((word, index) =>
      index === 0 ? word.toLocaleLowerCase() : capitalize(word)
    )
    .join("");
}

export function resolvePre10Configuration(options: {
  argv: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
}): ICypressPre10Configuration {
  debug(
    `attempting to resolve Cypress configuration using ${util.inspect(options)}`
  );

  const { argv, env } = options;

  const projectPath = resolveProjectPath(options);

  const cliOrigin: Partial<ICypressPre10Configuration> = Object.assign(
    {},
    ...Array.from(
      combine(
        traverseArgvMatching(argv, "--config", true),
        traverseArgvMatching(argv, "-c", false)
      )
    )
      .reverse()
      .flatMap((argument) => {
        const keypairExpr = /(?:^|,)([^=]+)=([^,$]+)/g;
        const entries: Partial<ICypressPre10Configuration>[] = [];
        let match;

        while ((match = keypairExpr.exec(argument)) !== null) {
          entries.push(validateConfigurationEntry(match[1], match[2]));
        }

        return entries;
      })
  );

  const envPrefixExpr = /^cypress_(.+)/i;

  const envOrigin: Partial<ICypressPre10Configuration> = Object.assign(
    {},
    ...Object.entries(env)
      .filter((entry) => {
        return envPrefixExpr.test(entry[0]);
      })
      .filter(isStringEntry)
      .map<[string, string]>((entry) => {
        const match = entry[0].match(envPrefixExpr);

        assert(
          match,
          "cypress-cucumber-preprocessor: expected match after test, this is likely a bug."
        );

        return [assertAndReturn(match[1]), entry[1]];
      })
      .map((entry) => {
        return validateConfigurationEntry(
          entry[0].includes("_") ? toCamelCase(entry[0]) : entry[0],
          entry[1]
        );
      })
  );

  let configOrigin: Partial<ICypressPre10Configuration> = {};

  const cypressConfigPath = ensureIsAbsolute(
    projectPath,
    resolveConfigurationFile(options)
  );

  if (fs.existsSync(cypressConfigPath)) {
    const cypressConfig = parseJsonFile(cypressConfigPath);

    if (typeof cypressConfig !== "object" || cypressConfig == null) {
      throw new Error(`Malformed ${cypressConfigPath}, expected an object`);
    }

    configOrigin = Object.assign(
      {},
      ...Object.entries(cypressConfig).map((entry) =>
        validateConfigurationEntry(...entry)
      )
    );
  }

  const configuration = Object.assign(
    {
      projectRoot: resolveProjectPath(options),
      integrationFolder: "cypress/integration",
      fixturesFolder: "cypress/fixtures",
      supportFile: "cypress/support/index.js",
      testFiles: "**/*.*",
      ignoreTestFiles: "*.hot-update.js",
    },
    configOrigin,
    envOrigin,
    cliOrigin
  );

  debug(`resolved configuration of ${util.inspect(configuration)}`);

  return { ...configuration, env: resolvePre10Environment(options) };
}

export function resolvePre10Environment(options: {
  argv: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
}): Record<string, any> {
  debug(
    `attempting to resolve Cypress environment using ${util.inspect(options)}`
  );

  const { argv, env } = options;

  const projectPath = resolveProjectPath(options);

  const envEntries = Array.from(
    combine(
      traverseArgvMatching(argv, "--env", true),
      traverseArgvMatching(argv, "-e", false)
    )
  );

  if (envEntries.length > 1) {
    console.warn(
      "You have specified -e / --env multiple times. This is likely a mistake, as only the last one will take affect. Multiple values should instead be comma-separated."
    );
  }

  const cliOrigin: Record<string, string> = Object.fromEntries(
    envEntries.slice(0, 1).flatMap((argument) => {
      const keypairExpr = /(?:^|,)([^=]+)=([^,$]+)/g;
      const entries: [string, string][] = [];
      let match;

      while ((match = keypairExpr.exec(argument)) !== null) {
        entries.push([match[1], match[2]]);
      }

      return entries;
    })
  );

  const envPrefixExpr = /^cypress_(.+)/i;

  const envOrigin: Record<string, string> = Object.fromEntries(
    Object.entries(env)
      .filter((entry) => {
        return envPrefixExpr.test(entry[0]);
      })
      .filter(isStringEntry)
      .map<[string, string]>((entry) => {
        const match = entry[0].match(envPrefixExpr);

        assert(
          match,
          "cypress-cucumber-preprocessor: expected match after test"
        );

        return [assertAndReturn(match[1]), entry[1]];
      })
  );

  const cypressConfigPath = ensureIsAbsolute(
    projectPath,
    resolveConfigurationFile(options)
  );

  let configOrigin: Record<string, any> = {};

  if (fs.existsSync(cypressConfigPath)) {
    const content = fs.readFileSync(cypressConfigPath).toString("utf8");

    const cypressConfig = JSON.parse(content);

    if (cypressConfig.env) {
      configOrigin = cypressConfig.env;
    }
  }

  const cypressEnvironmentFilePath = path.join(projectPath, "cypress.env.json");

  let cypressEnvOrigin: Record<string, any> = {};

  if (fs.existsSync(cypressEnvironmentFilePath)) {
    const content = fs
      .readFileSync(cypressEnvironmentFilePath)
      .toString("utf8");

    cypressEnvOrigin = JSON.parse(content);
  }

  const environment = Object.assign(
    {},
    cypressEnvOrigin,
    configOrigin,
    envOrigin,
    cliOrigin
  );

  debug(`resolved environment of ${util.inspect(environment)}`);

  return environment;
}

function resolveConfigurationFile(options: { argv: string[] }): string {
  const { argv } = options;

  return (
    findArgumentValue(argv, "--config-file", true) ||
    findArgumentValue(argv, "-C", false) ||
    "cypress.json"
  );
}

function resolveProjectPath(options: { argv: string[]; cwd: string }): string {
  const { argv, cwd } = options;

  const customProjectPath =
    findArgumentValue(argv, "--project", true) ||
    findArgumentValue(argv, "-P", false);

  if (customProjectPath) {
    return ensureIsAbsolute(cwd, customProjectPath);
  } else {
    return cwd;
  }
}

const MINIMATCH_OPTIONS = { dot: true, matchBase: true };

export function resolvePre10TestFiles(
  configuration: ICypressPre10Configuration
): string[] {
  const {
    projectRoot,
    integrationFolder,
    fixturesFolder,
    supportFile,
    testFiles,
    ignoreTestFiles,
  } = configuration;

  const testFilesPatterns = [testFiles].flat();
  const ignoreTestFilesPatterns = [ignoreTestFiles].flat();

  assertIsString(
    integrationFolder,
    `Expected "integrationFolder" to be a string, got ${util.inspect(
      integrationFolder
    )}`
  );

  const globIgnore = [];

  if (supportFile) {
    globIgnore.push(supportFile);
  }

  if (fixturesFolder) {
    assertIsString(
      fixturesFolder,
      `Expected "fixturesFolder" to be a string or false, got ${util.inspect(
        fixturesFolder
      )}`
    );

    globIgnore.push(path.join(fixturesFolder, "**", "*"));
  }

  const globOptions = {
    sort: true,
    absolute: true,
    nodir: true,
    cwd: ensureIsAbsolute(projectRoot, integrationFolder),
    ignore: globIgnore.flat(),
  };

  return testFilesPatterns
    .flatMap((testFilesPattern) => glob.sync(testFilesPattern, globOptions))
    .filter((file) =>
      ignoreTestFilesPatterns.every(
        (ignoreTestFilesPattern) =>
          !minimatch(file, ignoreTestFilesPattern, MINIMATCH_OPTIONS)
      )
    );
}
