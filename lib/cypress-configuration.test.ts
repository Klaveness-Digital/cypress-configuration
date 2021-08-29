import fs from "fs";

import path from "path";

import util from "util";

import assert from "assert";

import {
  resolveConfiguration,
  resolveEnvironment,
} from "./cypress-configuration";

interface CypressConfig {
  [key: string]: string | CypressConfig;
}

interface CypressEnvConfig {
  [key: string]: string;
}

function example(
  method: (options: {
    argv: string[];
    env: NodeJS.ProcessEnv;
    cwd: string;
  }) => any,
  options: {
    cypressConfig?: CypressConfig;
    cypressConfigPath?: string;
    cypressProjectPath?: string;
    cypressEnvConfig?: CypressEnvConfig;
    argv?: string[];
    env?: NodeJS.ProcessEnv;
    cwd?: string;
  },
  attribute: string,
  expected: any
) {
  it(`should return ${attribute} = "${expected}" for ${util.inspect(
    options
  )}}`, () => {
    const {
      cypressConfig,
      cypressConfigPath = "cypress.json",
      cypressEnvConfig,
      cypressProjectPath,
    } = options;

    const cwd = path.join(process.cwd(), "tmp", "unit");

    const fullCypressProjectPath = cypressProjectPath
      ? path.join(cwd, cypressProjectPath)
      : cwd;

    fs.rmSync(cwd, { recursive: true, force: true });
    fs.mkdirSync(fullCypressProjectPath, { recursive: true });

    if (cypressConfig) {
      fs.writeFileSync(
        path.join(fullCypressProjectPath, cypressConfigPath),
        JSON.stringify(cypressConfig, null, 2)
      );
    }

    if (cypressEnvConfig) {
      fs.writeFileSync(
        path.join(fullCypressProjectPath, "cypress.env.json"),
        JSON.stringify(cypressEnvConfig, null, 2)
      );
    }

    const actual = method({
      argv: [],
      env: {},
      cwd,
      ...options,
    });

    assert.strictEqual(actual[attribute], expected);
  });
}

describe("resolveConfiguration()", () => {
  // Default
  example(resolveConfiguration, {}, "integrationFolder", "cypress/integration");
  example(resolveConfiguration, {}, "fixturesFolder", "cypress/fixtures");
  example(resolveConfiguration, {}, "supportFile", "cypress/support/index.js");
  example(resolveConfiguration, {}, "testFiles", "**/*.*");
  example(resolveConfiguration, {}, "ignoreTestFiles", "*.hot-update.js");

  // Simple CLI override
  example(
    resolveConfiguration,
    {
      argv: ["--config", "integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--config=integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-c", "integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );

  // CLI override with preceding, comma-delimited configuration
  example(
    resolveConfiguration,
    {
      argv: ["--config", "foo=bar,integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--config=foo=bar,integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-c", "foo=bar,integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );

  // CLI override with succeeding, comma-delimited configuration
  example(
    resolveConfiguration,
    {
      argv: ["--config", "integrationFolder=foo/bar,foo=bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--config=integrationFolder=foo/bar,foo=bar"],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-c", "integrationFolder=foo/bar,foo=bar"],
    },
    "integrationFolder",
    "foo/bar"
  );

  // CLI override with last match taking precedence
  example(
    resolveConfiguration,
    {
      argv: [
        "--config",
        "integrationFolder=baz",
        "--config",
        "integrationFolder=foo/bar",
      ],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: [
        "--config=integrationFolder=baz",
        "--config=integrationFolder=foo/bar",
      ],
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-c", "integrationFolder=baz", "-c", "integrationFolder=foo/bar"],
    },
    "integrationFolder",
    "foo/bar"
  );

  const envTestMatrix: { env: Record<string, string>; expected: string }[] = [
    {
      env: {
        CYPRESS_integrationFolder: "foo/bar",
      },
      expected: "foo/bar",
    },
    {
      env: {
        cypress_integrationFolder: "foo/bar",
      },
      expected: "foo/bar",
    },
    {
      env: {
        CYPRESS_integration_folder: "foo/bar",
      },
      expected: "foo/bar",
    },
    {
      env: {
        cypress_integration_folder: "foo/bar",
      },
      expected: "foo/bar",
    },
    {
      env: {
        CYPRESS_INTEGRATION_FOLDER: "foo/bar",
      },
      expected: "foo/bar",
    },
    {
      env: {
        cypress_INTEGRATION_FOLDER: "foo/bar",
      },
      expected: "foo/bar",
    },
    // Erroneous camelcase
    {
      env: {
        CYPRESS_integrationfolder: "foo/bar",
      },
      expected: "cypress/integration",
    },
    {
      env: {
        cypress_integrationfolder: "foo/bar",
      },
      expected: "cypress/integration",
    },
  ];

  for (let { env, expected } of envTestMatrix) {
    example(
      resolveConfiguration,
      {
        env,
      },
      "integrationFolder",
      expected
    );
  }

  // Override with cypress.json
  example(
    resolveConfiguration,
    {
      cypressConfig: { integrationFolder: "foo/bar" },
    },
    "integrationFolder",
    "foo/bar"
  );

  // Override with cypress.json in custom location
  example(
    resolveConfiguration,
    {
      argv: ["--config-file", "foo.json"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--config-file=foo.json"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-C", "foo.json"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
    },
    "integrationFolder",
    "foo/bar"
  );

  // Override with cypress.json & custom project path.
  example(
    resolveConfiguration,
    {
      argv: ["--project", "foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--project=foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-P", "foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );

  // Override with cypress.json in custom location & custom project path.
  example(
    resolveConfiguration,
    {
      argv: ["--config-file", "foo.json", "--project", "foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["--config-file=foo.json", "--project", "foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );
  example(
    resolveConfiguration,
    {
      argv: ["-C", "foo.json", "--project", "foo"],
      cypressConfig: { integrationFolder: "foo/bar" },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "integrationFolder",
    "foo/bar"
  );
});

describe("resolveEnvironment()", () => {
  // Default
  example(resolveEnvironment, {}, "FOO", undefined);

  // Simple CLI override
  example(
    resolveEnvironment,
    {
      argv: ["--env", "FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--env=FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-e", "FOO=foo"],
    },
    "FOO",
    "foo"
  );

  // CLI override with preceding, comma-delimited configuration
  example(
    resolveEnvironment,
    {
      argv: ["--env", "BAR=bar,FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--env=BAR=bar,FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-e", "BAR=bar,FOO=foo"],
    },
    "FOO",
    "foo"
  );

  // CLI override with succeeding, comma-delimited configuration
  example(
    resolveEnvironment,
    {
      argv: ["--env", "FOO=foo,BAR=bar"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--env=FOO=foo,BAR=bar"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-e", "FOO=foo,BAR=bar"],
    },
    "FOO",
    "foo"
  );

  // CLI override with last match taking precedence
  example(
    resolveEnvironment,
    {
      argv: ["--env", "FOO=baz", "--env", "FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--env=FOO=baz", "--env=FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-e", "FOO=baz", "-e", "FOO=foo"],
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--env", "FOO=foo", "--env", "BAR=BAR"],
    },
    "FOO",
    undefined
  );

  const envTestMatrix: {
    env: Record<string, string>;
    expected: string | undefined;
  }[] = [
    {
      env: {
        CYPRESS_FOO: "foo",
      },
      expected: "foo",
    },
    {
      env: {
        cypress_FOO: "foo",
      },
      expected: "foo",
    },
    {
      env: {
        CYPRESS_foo: "foo",
      },
      expected: undefined,
    },
    {
      env: {
        cypress_foo: "foo",
      },
      expected: undefined,
    },
  ];

  for (let { env, expected } of envTestMatrix) {
    example(
      resolveEnvironment,
      {
        env,
      },
      "FOO",
      expected
    );
  }

  // Override with cypress.json
  example(
    resolveEnvironment,
    {
      cypressConfig: { env: { FOO: "foo" } },
    },
    "FOO",
    "foo"
  );

  // Override with cypress.json in custom location
  example(
    resolveEnvironment,
    {
      argv: ["--config-file", "foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--config-file=foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-C", "foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
    },
    "FOO",
    "foo"
  );

  // Override with cypress.env.json
  example(
    resolveEnvironment,
    {
      cypressEnvConfig: { FOO: "foo" },
    },
    "FOO",
    "foo"
  );

  // Override with cypress.json & custom project path.
  example(
    resolveEnvironment,
    {
      argv: ["--project", "foo"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--project=foo"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-P", "foo"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );

  // Override with cypress.json in custom location & custom project path.
  example(
    resolveEnvironment,
    {
      argv: ["--project", "foo", "--config-file", "foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--project=foo", "--config-file", "foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-P", "foo", "--config-file", "foo.json"],
      cypressConfig: { env: { FOO: "foo" } },
      cypressConfigPath: "foo.json",
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );

  // Override with cypress.env.json & custom project path.
  example(
    resolveEnvironment,
    {
      argv: ["--project", "foo"],
      cypressEnvConfig: { FOO: "foo" },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["--project=foo"],
      cypressEnvConfig: { FOO: "foo" },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
  example(
    resolveEnvironment,
    {
      argv: ["-P", "foo"],
      cypressEnvConfig: { FOO: "foo" },
      cypressProjectPath: "foo",
    },
    "FOO",
    "foo"
  );
});
