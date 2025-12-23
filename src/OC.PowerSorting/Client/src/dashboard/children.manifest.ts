export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "OCPower Sorting Children Dashboard",
    alias: "OC.PowerSorting-Children-Dashboard",
    type: "dashboard",
    js: () => import("./children.element.js"),
    meta: {
      label: "Sort Children",
      pathname: "power-sort-children/:id",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section",
      },
    ],
  },
];
