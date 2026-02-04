import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSort.Section",
    label: "Power Sort",
    pathname: "power-sort",
  }),
  
  // Section view removed - content is accessed contextually through dashboards
  // Users interact with Children/Schedules by clicking nodes in the tree or sidebar
  // If you need the Enum Priorities view, you can convert it to a dashboard instead
];
