import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as section } from "./section/manifest.js";
import { manifests as dashboard } from "./dashboard/manifest.js";
import { manifests as childrenDashboard } from "./dashboard/children.manifest.js";
import { manifests as schedulesDashboard } from "./dashboard/schedules.manifest.js";
import { manifests as sidebar } from "./sectionSidebar/manifest.js"; 
import { entitySignManifests } from "./entitySigns/manifest.js";

// Job of the bundle is to collate all the manifests from different parts of the extension and load other manifests
// We load this bundle from umbraco-package.json
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...dashboard,
  ...childrenDashboard,
  ...schedulesDashboard,
  ...section,
  ...sidebar,
  ...entitySignManifests,
];
