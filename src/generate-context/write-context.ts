import fs from "node:fs/promises";
import path from "node:path";

export async function writeContext(featurePath: string, content: string) {
  const featureName = featurePath.split("/").pop() || "feature";

  const output = path.join(featurePath, `${featureName}.context.md`);

  await fs.writeFile(output, content);

  console.log(`generated: ${output}`);
}
