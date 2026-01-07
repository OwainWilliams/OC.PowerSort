import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    label: "Power Sort Dashboard",
    pathname: "power-sort-dashboard",
    jsImport: () => import("./powersort.element.js"),
  }),
];
