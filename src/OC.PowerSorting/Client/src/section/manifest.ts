export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "section",
    alias: "OC.PowerSorting.Section",
    name: "Power Sort Section",
    weight: 100,
    meta: {
      label: "Power Sort",
      pathname: "power-sort",
    },
  },
  {
    type: "sectionView",
    alias: "OC.PowerSorting.SectionView",
    name: "Power Sort Section View",
    js: () => import("./section-view.element.js"),
    weight: 200,
    meta: {
      label: "Power Sort",
      pathname: "view",
      icon: "icon-sort",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section",
      },
    ],
  },
];
