import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createSidebarAppManifest({
    name: "My Section Sidebar App",
    alias: "OC.PowerSorting.SectionSidebar",
    label: "Power Sorting Sidebar",
    icon: "icon-sort",
    jsImport: () => import('./sidebar-app.element.js'),
    menus: ["OC.PowerSorting.Menu"]
  })
];
