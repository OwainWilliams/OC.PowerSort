import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sorting Children Dashboard",
    alias: "OC.PowerSorting-Children-Dashboard",
    label: "Sort Children",
    pathname: "power-sort-children/:id",
    jsImport: () => import("./children.element.js"),
  }),
];
