import {
  ICypressPost10Configuration,
  resolvePost10TestFiles,
} from "./cypress-post10-configuration";

import {
  ICypressPre10Configuration,
  resolvePre10Configuration,
  resolvePre10Environment,
  resolvePre10TestFiles,
} from "./cypress-pre10-configuration";

export { ICypressPre10Configuration, ICypressPost10Configuration };

export type ICypressConfiguration =
  | ICypressPre10Configuration
  | ICypressPost10Configuration;

export function resolveConfiguration(options: {
  argv: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
}): ICypressConfiguration {
  return resolvePre10Configuration(options);
}

export function resolveEnvironment(options: {
  argv: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
}): Record<string, any> {
  return resolvePre10Environment(options);
}

export function resolveTestFiles(
  configuration: ICypressConfiguration
): string[] {
  if ("specPattern" in configuration) {
    return resolvePost10TestFiles(configuration);
  } else {
    return resolvePre10TestFiles(configuration);
  }
}
