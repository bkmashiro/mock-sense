import { stat } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";

function normalizeExtensionPattern(extension: string): string {
  const trimmed = extension.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed.startsWith(".") ? `*${trimmed}` : `*.${trimmed}`;
}

export async function collectTestFiles(targetPath: string, extensions: string[]): Promise<string[]> {
  const absolutePath = path.resolve(targetPath);
  const targetStat = await stat(absolutePath);

  if (targetStat.isFile()) {
    return [absolutePath];
  }

  const patterns = extensions
    .map(normalizeExtensionPattern)
    .filter((pattern) => pattern.length > 0)
    .map((pattern) => `**/${pattern}`);

  const files = await glob(patterns, {
    cwd: absolutePath,
    absolute: true,
    nodir: true
  });

  return files.sort((left, right) => left.localeCompare(right));
}
