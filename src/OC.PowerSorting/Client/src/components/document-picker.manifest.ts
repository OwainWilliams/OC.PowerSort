import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    label: "custom document picker",
    pathname: "custom-document-picker",
    jsImport: () => import("./document-picker.js"),
  }),
];
