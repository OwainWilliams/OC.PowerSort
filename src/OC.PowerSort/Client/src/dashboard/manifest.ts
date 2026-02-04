import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  // Main dashboard - handles all views (main, children, schedules) through conditional rendering
  // The powersort.element component detects the current route and renders the appropriate view
  ManifestFactory.createDashboardManifest({
    name: "OCPower Sort Dashboard",
    alias: "OC.PowerSort-Dashboard",
    label: "Power Sort",
    pathname: "power-sort-dashboard",
    jsImport: () => import("./powersort.element.js"),
  }),
];
