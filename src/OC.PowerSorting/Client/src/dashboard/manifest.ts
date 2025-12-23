export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    type: "dashboard",
    js: () => import("./powersort.element.js"),
    meta: {
      label: "Power Sort Dashboard",
      pathname: "power-sort-dashboard",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section",
      },
    ],
  },
];
