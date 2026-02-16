import { spawnSync } from 'child_process';
import path from 'path';

export function callDonutInference(
  filePath: string,
  scriptPath: string,
  pythonBin: string,
) {
  const proc = spawnSync(pythonBin, [scriptPath, '--input', filePath], {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (proc.error || proc.status !== 0) {
    throw new Error(
      proc.error?.message ??
        `Donut inference failed: ${proc.stderr?.slice(0, 200) || 'unknown'}`,
    );
  }
  const stdout = proc.stdout?.trim();
  if (!stdout) {
    throw new Error('Donut did not return content.');
  }
  return JSON.parse(stdout);
}
