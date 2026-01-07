import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sorting Schedules Dashboard",
    alias: "OC.PowerSorting-Schedules-Dashboard",
    label: "Manage Schedules",
    pathname: "power-sort-schedules/:id",
    jsImport: () => import("./schedules.element.js"),
  }),
];
