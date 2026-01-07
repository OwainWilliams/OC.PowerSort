import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createEntrypointManifest({
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSorting.Entrypoint",
    jsImport: () => import("./entrypoint.js"),
  }),
];
