export const manifests: Array<UmbExtensionManifest> = [
  // Dashboard registered for routing only - should not appear as a tab
  {
    type: "dashboard",
    alias: "OC.PowerSort-Children-Dashboard",
    name: "OCPower Sort Children Dashboard",
    js: () => import("./children.element.js"),
    weight: 900, // Very high weight pushes it out of view
    meta: {
      label: "", // Empty label hides it from tab display
      pathname: "power-sort-children/:id",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSort.Section",
      },
    ],
  },
];
