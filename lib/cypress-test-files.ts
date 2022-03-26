import path from "path";

import util from "util";

import glob from "glob";

import minimatch from "minimatch";

import { assertIsString } from "./assertions";

import { ICypressConfiguration } from "./cypress-configuration";

const MINIMATCH_OPTIONS = { dot: true, matchBase: true };

export function resolveTestFiles(
  configuration: ICypressConfiguration
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
    cwd: path.join(projectPath, integrationFolder),
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
