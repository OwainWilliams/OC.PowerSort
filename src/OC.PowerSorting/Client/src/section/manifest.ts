import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSorting.Section",
    label: "Power Sort",
    pathname: "power-sort",
  }),
  
  ManifestFactory.createSectionViewManifest({
    name: "Power Sort Section View",
    alias: "OC.PowerSorting.SectionView",
    label: "Settings",
    pathname: "view",
    icon: "icon-settings",
    jsImport: () => import("./priority-section-view.element.js"),
  }),
];
