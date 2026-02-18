import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl =
  process.env.SENSORS_LOG_SOURCE_URL ??
  "https://spl.decadalab.ru/responder_spl_dat_test/data/log.txt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, "..", "public", "api", "sensors-log");

function toMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function main() {
  try {
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, text, "utf8");

    console.log(
      `[prepare-log] Saved sensors log snapshot (${text.length} chars) to ${targetPath}`,
    );
  } catch (error) {
    if (existsSync(targetPath)) {
      console.warn(
        `[prepare-log] Download failed (${toMessage(error)}), using existing snapshot ${targetPath}`,
      );
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(
    `[prepare-log] Unable to prepare sensors log snapshot from ${sourceUrl}: ${toMessage(error)}`,
  );
  process.exit(1);
});
