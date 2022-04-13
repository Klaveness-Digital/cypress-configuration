# cypress-configuration

A re-implementation of Cypress' configuration resolvement and search for test files. These mechanisms
[aren't exposed][issue] by Cypress, but are nonetheless necessary for EG.
[@klaveness/cypress-cucumber-preprocessor][cypress-cucumber-preprocessor],
[@klaveness/cypress-parallel][cypress-parallel] and the upcoming VSCode extention for the Cypress + Cucumber integration.

[issue]: https://github.com/cypress-io/cypress/issues/9014
[cypress-cucumber-preprocessor]: https://github.com/klaveness/cypress-cucumber-preprocessor
[cypress-parallel]: https://github.com/klaveness/cypress-parallel

## Installation

See [badeball/cypress-configuration](https://github.com/badeball/cypress-configuration) for a public, community-maintained edition and installation instructions.

## Usage

```ts
import { getConfiguration } from "@klaveness/cypress-configuration";

const { fixturesFolder, integrationFolder } = getConfiguration({
  cwd: process.cwd(),
  env: process.env,
  argv: ["--config", "integrationFolder=cypress/custom-location"]
});

console.log(fixturesFolder); // => "cypress/fixtures"
console.log(integrationFolder); // => "cypress/custom-location"
```
