#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  analyzeCoverageFile,
  type CoverageFileAnalysis
} from "./coverage-checker.js";
import { analyzeFile, type FileAnalysis } from "./detector.js";
import {
  formatCoverageReport,
  formatReport,
  formatSuggestionReport,
  type CoverageReportData,
  type ReportData,
  type SuggestionReportData
} from "./formatter.js";
import { collectTestFiles } from "./scanner.js";
import { suggestForFile, type Suggestion } from "./suggester.js";

interface CliOptions {
  threshold: string;
  json?: boolean;
  fail: boolean;
  ext: string;
  coverage?: boolean;
  suggest?: boolean;
}

export function buildReportData(
  analyzedPath: string,
  results: FileAnalysis[],
  threshold: number
): ReportData {
  const suspiciousFiles = results.filter((result) => result.suspicious).length;
  const vacuousAssertions = results.reduce(
    (count, result) => count + result.vacuousAssertions.length,
    0
  );

  return {
    analyzedPath,
    analyzedFileCount: results.length,
    results,
    suspiciousFiles,
    vacuousAssertions,
    issuesFound: suspiciousFiles > 0 || vacuousAssertions > 0,
    threshold
  };
}

export function buildCoverageReportData(
  analyzedPath: string,
  results: CoverageFileAnalysis[]
): CoverageReportData {
  const deadMocks = results.reduce((count, result) => count + result.deadMocks, 0);
  const uncheckedMocks = results.reduce((count, result) => count + result.uncheckedMocks, 0);

  return {
    analyzedPath,
    analyzedFileCount: results.length,
    results,
    deadMocks,
    uncheckedMocks,
    issuesFound: deadMocks > 0 || uncheckedMocks > 0
  };
}

export function buildSuggestionReportData(
  analyzedPath: string,
  analyzedFileCount: number,
  suggestions: Suggestion[]
): SuggestionReportData {
  return {
    analyzedPath,
    analyzedFileCount,
    suggestions,
    issuesFound: suggestions.length > 0
  };
}

function createProgram(): Command {
  return new Command()
    .name("mock-sense")
    .description("Detect over-mocking and vacuous assertions in unit tests")
    .argument("<path>", "Path to a test file or directory")
    .option("--threshold <n>", "Mock/assert ratio threshold", "3.0")
    .option("--json", "JSON output")
    .option("--no-fail", "Don't exit 1 on issues")
    .option("--coverage", "Show mock usage coverage")
    .option("--suggest", "Suggest missing assertions")
    .option(
      "--ext <exts>",
      "File extensions",
      ".test.ts,.test.js,.spec.ts,.spec.js"
    )
    .action(async (targetPath: string, options: CliOptions) => {
      if (options.coverage && options.suggest) {
        console.error("Choose either --coverage or --suggest, not both.");
        process.exitCode = 2;
        return;
      }

      const threshold = Number.parseFloat(options.threshold);

      if (!Number.isFinite(threshold) || threshold < 0) {
        console.error("Invalid threshold. Expected a non-negative number.");
        process.exitCode = 2;
        return;
      }

      const extensions = options.ext.split(",");
      const files = await collectTestFiles(targetPath, extensions);
      if (options.coverage) {
        const results = await Promise.all(files.map((filePath) => analyzeCoverageFile(filePath)));
        const report = buildCoverageReportData(targetPath, results);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatCoverageReport(report));
        }

        if (report.issuesFound && options.fail) {
          process.exitCode = 1;
        }
        return;
      }

      if (options.suggest) {
        const suggestionLists = await Promise.all(files.map((filePath) => suggestForFile(filePath)));
        const report = buildSuggestionReportData(targetPath, files.length, suggestionLists.flat());

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatSuggestionReport(report));
        }

        if (report.issuesFound && options.fail) {
          process.exitCode = 1;
        }
        return;
      }

      const results = await Promise.all(files.map((filePath) => analyzeFile(filePath, threshold)));
      const report = buildReportData(targetPath, results, threshold);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatReport(report));
      }

      if (report.issuesFound && options.fail) {
        process.exitCode = 1;
      }
    });
}

export async function runCli(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
  });
}
