export const manifests: Array<UmbExtensionManifest> = [
  // Dashboard registered for routing only - should not appear as a tab
  {
    type: "dashboard",
    alias: "OC.PowerSorting-Schedules-Dashboard",
    name: "OCPower Sorting Schedules Dashboard",
    js: () => import("./schedules.element.js"),
    weight: 900, // Very high weight pushes it out of view
    meta: {
      label: "", // Empty label hides it from tab display
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
