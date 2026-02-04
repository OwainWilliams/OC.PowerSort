import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sort Dashboard",
    alias: "OC.PowerSort-Dashboard",
    label: "custom document picker",
    pathname: "custom-document-picker",
    jsImport: () => import("./document-picker.js"),
  }),
];
