import { ensureMaterialFigures } from "../lib/materialFigureExtractor";

async function main() {
  const id = process.argv[2] || "cmtnjlnzr0001zukr67s79vx4";
  console.time("ensure");
  const n = await ensureMaterialFigures(id);
  console.timeEnd("ensure");
  console.log("saved figures", n);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
