const o = [
  {
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSorting.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-CUHy5R0W.js")
  }
], t = [
  {
    type: "section",
    alias: "OC.PowerSorting.Section",
    name: "Power Sort Section",
    weight: 100,
    meta: {
      label: "Power Sort",
      pathname: "power-sort"
    }
  },
  {
    type: "sectionView",
    alias: "OC.PowerSorting.SectionView",
    name: "Power Sort Section View",
    js: () => import("./section-view.element-B1ICiDDx.js"),
    weight: 200,
    meta: {
      label: "Power Sort",
      pathname: "view",
      icon: "icon-sort"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section"
      }
    ]
  }
], i = [
  {
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    type: "dashboard",
    js: () => import("./powersort.element-ej0Xuua6.js"),
    meta: {
      label: "Power Sort Dashboard",
      pathname: "power-sort-dashboard"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section"
      }
    ]
  }
], e = [
  {
    name: "OCPower Sorting Children Dashboard",
    alias: "OC.PowerSorting-Children-Dashboard",
    type: "dashboard",
    js: () => import("./children.element-ERDTc107.js"),
    meta: {
      label: "Sort Children",
      pathname: "power-sort-children/:id"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "OC.PowerSorting.Section"
      }
    ]
  }
], n = [
  {
    type: "sectionSidebarApp",
    alias: "OC.PowerSorting.SectionSidebar",
    name: "My Section Sidebar App",
    element: () => import("./sidebar-app.element-At-v3FhW.js"),
    conditions: [{
      alias: "Umb.Condition.SectionAlias",
      match: "OC.PowerSorting.Section"
    }],
    meta: {
      label: "Power Sorting Sidebar",
      icon: "icon-sort",
      menus: ["OC.PowerSorting.Menu"]
    }
  }
], a = [
  ...o,
  ...i,
  ...e,
  ...t,
  ...n
];
export {
  a as manifests
};
//# sourceMappingURL=oc-power-sorting.js.map
