import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { pythonExecutable } from "@/lib/pythonRuntime";

const execFileAsync = promisify(execFile);

type PythonCommand = {
  cwd: string;
  script: string;
  args?: string[];
  timeout?: number;
  maxBuffer?: number;
};

export function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

export async function runPython({
  cwd,
  script,
  args = [],
  timeout = 30_000,
  maxBuffer = 10 * 1024 * 1024,
}: PythonCommand) {
  const root = process.cwd();
  const python = await pythonExecutable(root);
  const { stdout } = await execFileAsync(python, [script, ...args], {
    cwd: projectPath(cwd),
    timeout,
    maxBuffer,
  });
  return stdout.trim();
}

export async function runPythonJson<T>(command: PythonCommand): Promise<T> {
  const stdout = await runPython(command);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(`Python 명령이 올바른 JSON을 반환하지 않았습니다: ${command.script}`);
  }
}

export function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isPythonDependencyError(error: unknown) {
  return /No module named|ModuleNotFoundError|chronos/i.test(errorDetail(error));
}
