import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createEntrypointManifest({
    name: "OCPower Sort Entrypoint",
    alias: "OC.PowerSort.Entrypoint",
    jsImport: () => import("./entrypoint.js"),
  }),
];
