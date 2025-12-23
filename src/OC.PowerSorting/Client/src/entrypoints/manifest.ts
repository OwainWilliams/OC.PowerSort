export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSorting.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
