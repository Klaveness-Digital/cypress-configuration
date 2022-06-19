import glob from "glob";

export interface ICypressPost10Configuration {
  projectRoot: string;
  specPattern: string | string[];
  excludeSpecPattern: string | string[];
  env: Record<string, any>;
}

export function resolvePost10TestFiles(
  configuration: ICypressPost10Configuration
): string[] {
  let {
    projectRoot,
    specPattern: specPatterns,
    excludeSpecPattern: excludeSpecPatterns,
  } = configuration;

  specPatterns = [specPatterns].flat();

  excludeSpecPatterns = [excludeSpecPatterns].flat();

  const globOptions = {
    sort: true,
    absolute: true,
    nodir: true,
    cwd: projectRoot,
    ignore: excludeSpecPatterns,
  };

  return specPatterns.flatMap((specPattern) =>
    glob.sync(specPattern, globOptions)
  );
}
