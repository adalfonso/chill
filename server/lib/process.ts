import { spawn } from "node:child_process";

interface ProcessResult {
  data: string;
  error: string;
  code: number | null;
}

/**
 * Make a spawned process async
 *
 * @param command - command name
 * @param args - command args
 * @returns promise wrapper
 */
export const spawnChild = async (command: string, args: string[] = []) =>
  new Promise<ProcessResult>((resolve, reject) => {
    try {
      const result = spawn(command, args);
      let data = "";
      let error = "";

      result.stdout.on("data", (d) => (data += d.toString()));
      result.stderr.on("data", (e) => (error += e.toString()));
      result.on("close", (code) => resolve({ data, error, code }));
    } catch (e) {
      reject(e);
    }
  });
