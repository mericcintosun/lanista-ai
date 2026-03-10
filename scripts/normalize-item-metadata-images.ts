import * as fs from "fs/promises";
import * as path from "path";

const METADATA_RELATIVE = "apps/frontend/public/assets/items/metadata";

const ASSET_HOST =
  process.env.ASSET_HOST || "https://lanista-ai-production.up.railway.app";

async function findMetadataDir(fromDir: string): Promise<string> {
  let current = path.resolve(fromDir);
  for (let i = 0; i < 20; i++) {
    const candidate = path.join(current, METADATA_RELATIVE);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // keep walking up
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    `Could not find metadata dir '${METADATA_RELATIVE}' when starting from: ${fromDir}`
  );
}

function toAbsoluteImageUrl(imageValue: unknown): unknown {
  if (typeof imageValue !== "string") return imageValue;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://"))
    return imageValue;
  if (imageValue.startsWith("ipfs://")) return imageValue;
  if (imageValue.startsWith("/")) return `${ASSET_HOST}${imageValue}`;
  // fallback: relative path like "assets/items/x.png"
  return `${ASSET_HOST}/${imageValue.replace(/^\/*/, "")}`;
}

async function main() {
  const METADATA_DIR = await findMetadataDir(process.cwd());

  const files = (await fs.readdir(METADATA_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "en"));

  let updated = 0;
  for (const file of files) {
    const filePath = path.join(METADATA_DIR, file);
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw) as Record<string, unknown>;

    const before = json.image;
    const after = toAbsoluteImageUrl(before);
    if (after !== before) {
      json.image = after as any;
      await fs.writeFile(filePath, JSON.stringify(json, null, 2) + "\n", "utf8");
      updated++;
    }
  }

  console.log(`Metadata files scanned: ${files.length}`);
  console.log(`Metadata files updated: ${updated}`);
  console.log(`ASSET_HOST: ${ASSET_HOST}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

