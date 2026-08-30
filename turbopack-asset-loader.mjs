import { readFileSync } from "node:fs";
import { extname } from "node:path";

const MIME_TYPES = {
  ".glb": "model/gltf-binary",
  ".png": "image/png",
};

export default function turbopackAssetLoader() {
  const extension = extname(this.resourcePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] ?? "application/octet-stream";
  const contents = readFileSync(this.resourcePath).toString("base64");
  return `export default ${JSON.stringify(`data:${mimeType};base64,${contents}`)};`;
}
