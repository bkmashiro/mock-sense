import path from "node:path";
import chalk from "chalk";
import type { CoverageFileAnalysis } from "./coverage-checker.js";
import type { FileAnalysis } from "./detector.js";
import type { Suggestion } from "./suggester.js";

export interface ReportData {
  analyzedPath: string;
  analyzedFileCount: number;
  results: FileAnalysis[];
  suspiciousFiles: number;
  vacuousAssertions: number;
  issuesFound: boolean;
  threshold: number;
}

export interface CoverageReportData {
  analyzedPath: string;
  analyzedFileCount: number;
  results: CoverageFileAnalysis[];
  deadMocks: number;
  uncheckedMocks: number;
  issuesFound: boolean;
}

export interface SuggestionReportData {
  analyzedPath: string;
  analyzedFileCount: number;
  suggestions: Suggestion[];
  issuesFound: boolean;
}

export function formatReport(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`Analyzing ${report.analyzedFileCount} test file${report.analyzedFileCount === 1 ? "" : "s"}...`);
  lines.push("");

  for (const result of report.results) {
    const displayPath = path.relative(process.cwd(), result.filePath) || result.filePath;
    const hasIssues = result.suspicious || result.vacuousAssertions.length > 0;

    if (hasIssues) {
      lines.push(`${chalk.yellow("⚠")}  ${displayPath}`);

      if (result.suspicious) {
        const ratioText = Number.isFinite(result.ratio) ? result.ratio.toFixed(1) : "Infinity";
        lines.push(
          `   Mocks: ${result.mocks} | Assertions: ${result.assertions} | Ratio: ${ratioText} (suspicious, threshold: ${report.threshold.toFixed(1)})`
        );
      }

      for (const vacuous of result.vacuousAssertions) {
        lines.push(`   Line ${vacuous.line}: ${vacuous.text}  \u2190 vacuous assertion`);
      }

      lines.push("");
      continue;
    }

    lines.push(`${chalk.green("✓")}  ${displayPath}  ${chalk.gray("(healthy)")}`);
  }

  if (report.results.length > 0 && lines[lines.length - 1] !== "") {
    lines.push("");
  }

  lines.push(
    `Summary: ${report.suspiciousFiles} suspicious file${report.suspiciousFiles === 1 ? "" : "s"}, ${report.vacuousAssertions} vacuous assertion${report.vacuousAssertions === 1 ? "" : "s"} found.`
  );
  lines.push(`Exit code: ${report.issuesFound ? 1 : 0} (${report.issuesFound ? "issues found" : "healthy"})`);

  return lines.join("\n");
}

export function formatCoverageReport(report: CoverageReportData): string {
  const lines: string[] = [];
  lines.push("Mock Usage Coverage:");
  lines.push("");

  for (const result of report.results) {
    if (result.mocks.length === 0) {
      continue;
    }

    const displayPath = path.relative(process.cwd(), result.filePath) || result.filePath;
    lines.push(`  ${displayPath}`);

    for (const mock of result.mocks) {
      if (mock.callCount === 0) {
        lines.push(`  ${chalk.red("❌")} ${mock.name} (mocked but NEVER called - dead mock)`);
        continue;
      }

      if (!mock.assertedOn) {
        lines.push(
          `  ${chalk.yellow("⚠")}  ${mock.name} (mocked, called ${mock.callCount}x but never asserted on)`
        );
        continue;
      }

      lines.push(`  ${chalk.green("✅")} ${mock.name} (mocked, called ${mock.callCount}x)`);
    }

    lines.push("");
  }

  lines.push(
    `Dead mocks: ${report.deadMocks} ${report.deadMocks > 0 ? "(remove them to simplify tests)" : ""}`.trimEnd()
  );
  lines.push(
    `Unchecked mocks: ${report.uncheckedMocks} ${report.uncheckedMocks > 0 ? "(add assertions)" : ""}`.trimEnd()
  );

  return lines.join("\n");
}

export function formatSuggestionReport(report: SuggestionReportData): string {
  const lines: string[] = [];
  lines.push("Suggested improvements:");
  lines.push("");

  for (const suggestion of report.suggestions) {
    const displayPath = path.relative(process.cwd(), suggestion.filePath) || suggestion.filePath;
    lines.push(`${displayPath}:${suggestion.line}`);
    lines.push(`  ${suggestion.reason}`);
    lines.push(`  → Add: ${suggestion.suggestion}`);
    lines.push("");
  }

  if (report.suggestions.length === 0) {
    lines.push("No missing mock assertions found.");
  }

  return lines.join("\n").trimEnd();
}
