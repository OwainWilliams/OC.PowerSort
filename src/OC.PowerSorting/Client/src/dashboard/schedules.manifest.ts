export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "OCPower Sorting Schedules Dashboard",
    alias: "OC.PowerSorting-Schedules-Dashboard",
    type: "dashboard",
    js: () => import("./schedules.element.js"),
    meta: {
      label: "Manage Schedules",
      pathname: "power-sort-schedules/:id",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section",
      },
    ],
  },
];
