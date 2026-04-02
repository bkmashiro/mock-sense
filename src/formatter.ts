import path from "node:path";
import chalk from "chalk";
import type { FileAnalysis } from "./detector.js";

export interface ReportData {
  analyzedPath: string;
  analyzedFileCount: number;
  results: FileAnalysis[];
  suspiciousFiles: number;
  vacuousAssertions: number;
  issuesFound: boolean;
  threshold: number;
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
