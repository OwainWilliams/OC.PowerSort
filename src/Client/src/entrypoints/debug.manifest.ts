export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "entrypoint",
    alias: "OC.PowerSorting.entry.debug",
    name: "OC.PowerSorting Debug Entrypoint",
    js: () => import("../debug.log.js")
  }
];
