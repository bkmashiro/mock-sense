# mock-sense

[![npm](https://img.shields.io/npm/v/mock-sense)](https://www.npmjs.com/package/mock-sense) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`mock-sense` is a CLI that scans unit test files for mock-related test smells:

- over-mocking, based on a mock-to-assertion ratio
- vacuous assertions that always pass
- dead mocks that are configured but never used
- unchecked mocks that are called without any follow-up assertion

## Install

```bash
pnpm add -D mock-sense
```

Or run it locally in this repo:

```bash
pnpm install
pnpm build
node dist/index.js test/
```

## Usage

```bash
mock-sense <path> [options]
```

Options:

- `--threshold <n>`: Mock/assert ratio threshold. Default: `3.0`
- `--json`: Emit JSON instead of terminal output
- `--no-fail`: Report only. Do not exit with status `1` when issues are found
- `--coverage`: Show mock usage coverage for each test file
- `--suggest`: Suggest missing assertions from mock call patterns
- `--ext <exts>`: Comma-separated test file extensions. Default: `.test.ts,.test.js,.spec.ts,.spec.js`

## What It Detects

### Over-mocking

For each file, `mock-sense` counts lines matching mock patterns such as:

- `jest.mock(`
- `vi.mock(`
- `sinon.stub(`
- `jest.fn(`
- `vi.fn(`
- `mock.`
- `.mockReturnValue(`
- `.mockResolvedValue(`

It also counts assertion lines matching:

- `expect(`
- `assert.`
- `should.`

If `mocks / assertions` is greater than the configured threshold, the file is flagged as suspicious.

### Vacuous Assertions

`mock-sense` flags assertions that always pass, including:

- `assert.equal(true, true)`
- `assert.ok(true)`
- `assert.strictEqual(1, 1)` and similar same-literal comparisons
- `expect(true).toBe(true)`
- `assert.ok(undefined !== undefined)`

### Mock Coverage

`mock-sense --coverage` tracks locally defined mocks such as `const sendEmail = jest.fn()` and reports:

- mocks that are never called
- mocks that are called but never asserted on

### Suggestions

`mock-sense --suggest` uses the same call analysis to recommend missing assertions such as:

- `expect(sendEmail).toHaveBeenCalledWith(...)`
- `expect(result).toBeDefined()` for unchecked mock return values

## Examples

```bash
mock-sense test/
```

```text
Analyzing 4 test files...

⚠  test/over-mocked.test.ts
   Mocks: 15 | Assertions: 2 | Ratio: 7.5 (suspicious, threshold: 3.0)

⚠  test/vacuous.test.ts
   Line 3: assert.equal(true, true)  ← vacuous assertion
   Line 4: assert.ok(undefined !== undefined)  ← vacuous assertion

✓  test/healthy.test.ts  (healthy)

Summary: 2 suspicious files, 2 vacuous assertions found.
Exit code: 1 (issues found)
```

```bash
mock-sense test --json --no-fail
```

Outputs structured JSON suitable for CI or custom reporting.

```bash
mock-sense test --coverage
```

```bash
mock-sense test --suggest
```
