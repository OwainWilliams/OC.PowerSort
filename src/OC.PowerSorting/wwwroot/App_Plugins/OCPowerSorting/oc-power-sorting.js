import { UMB_DOCUMENT_ENTITY_TYPE as a } from "@umbraco-cms/backoffice/document";
const n = class n {
  /**
   * Create dashboard manifest with consistent structure
   */
  static createDashboardManifest(e) {
    return {
      name: e.name,
      alias: e.alias,
      type: "dashboard",
      js: e.jsImport,
      meta: {
        label: e.label,
        pathname: e.pathname
      },
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS
        }
      ]
    };
  }
  /**
   * Create section manifest
   */
  static createSectionManifest(e) {
    return {
      type: "section",
      alias: e.alias,
      name: e.name,
      weight: e.weight ?? 100,
      meta: {
        label: e.label,
        pathname: e.pathname
      }
    };
  }
  /**
   * Create section view manifest
   */
  static createSectionViewManifest(e) {
    return {
      type: "sectionView",
      alias: e.alias,
      name: e.name,
      js: e.jsImport,
      weight: e.weight ?? 200,
      meta: {
        label: e.label,
        pathname: e.pathname,
        icon: e.icon
      },
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS
        }
      ]
    };
  }
  /**
   * Create sidebar app manifest
   */
  static createSidebarAppManifest(e) {
    return {
      type: "sectionSidebarApp",
      alias: e.alias,
      name: e.name,
      element: e.jsImport,
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS
        }
      ],
      meta: {
        label: e.label,
        icon: e.icon,
        menus: e.menus || []
      }
    };
  }
  /**
   * Create entrypoint manifest
   */
  static createEntrypointManifest(e) {
    return {
      name: e.name,
      alias: e.alias,
      type: "backofficeEntryPoint",
      js: e.jsImport
    };
  }
};
n.SECTION_ALIAS = "OC.PowerSorting.Section";
let t = n;
const o = [
  t.createEntrypointManifest({
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSorting.Entrypoint",
    jsImport: () => import("./entrypoint-CUHy5R0W.js")
  })
], r = [
  t.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSorting.Section",
    label: "Power Sort",
    pathname: "power-sort"
  }),
  t.createSectionViewManifest({
    name: "Power Sort Section View",
    alias: "OC.PowerSorting.SectionView",
    label: "Settings",
    pathname: "view",
    icon: "icon-settings",
    jsImport: () => import("./priority-section-view.element-CIzB7BtP.js")
  })
], s = [
  t.createDashboardManifest({
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    label: "Power Sort Dashboard",
    pathname: "power-sort-dashboard",
    jsImport: () => import("./powersort.element-BaNxFkTW.js")
  })
], l = [
  t.createDashboardManifest({
    name: "OCPower Sorting Children Dashboard",
    alias: "OC.PowerSorting-Children-Dashboard",
    label: "Sort Children",
    pathname: "power-sort-children/:id",
    jsImport: () => import("./children.element-COyUf00B.js")
  })
], m = [
  t.createDashboardManifest({
    name: "OCPower Sorting Schedules Dashboard",
    alias: "OC.PowerSorting-Schedules-Dashboard",
    label: "Manage Schedules",
    pathname: "power-sort-schedules/:id",
    jsImport: () => import("./schedules.element-B8Lu2WMR.js")
  })
], S = [
  t.createSidebarAppManifest({
    name: "My Section Sidebar App",
    alias: "OC.PowerSorting.SectionSidebar",
    label: "Power Sorting Sidebar",
    icon: "icon-sort",
    jsImport: () => import("./sidebar-app.element-mAgzSIj4.js"),
    menus: ["OC.PowerSorting.Menu"]
  })
], i = "Umb.", c = [
  // Custom Sorted Flag - Shows when document has been manually sorted
  {
    type: "entitySign",
    kind: "icon",
    alias: "OC.PowerSort.EntitySign.CustomSorted",
    name: "Custom Sorted Document Entity Sign",
    // Specifying which entities can show this sign
    forEntityTypes: [a],
    // Specify what entities should be "flagged" to make the sign show
    // Must match the flag added by the server-side IFlagProvider
    forEntityFlags: [`${i}OC.PowerSort.CustomSorted`],
    weight: 100,
    meta: {
      // Specifying what the sign looks like
      iconName: "icon-lab",
      label: "Custom Sorted",
      iconColorAlias: "blue"
    }
  },
  // Active Schedule Flag - Shows when document has active schedules
  {
    type: "entitySign",
    kind: "icon",
    alias: "OC.PowerSort.EntitySign.HasSchedule",
    name: "Has Active Schedule Entity Sign",
    forEntityTypes: [a],
    forEntityFlags: [`${i}OC.PowerSort.HasSchedule`],
    weight: 200,
    meta: {
      iconName: "icon-calendar",
      label: "Scheduled",
      iconColorAlias: "green"
    }
  },
  // Has Default Order Flag - Shows when document is parent with default order
  {
    type: "entitySign",
    kind: "icon",
    alias: "OC.PowerSort.EntitySign.HasDefaultOrder",
    name: "Has Default Order Entity Sign",
    forEntityTypes: [a],
    forEntityFlags: [`${i}OC.PowerSort.HasDefaultOrder`],
    weight: 150,
    meta: {
      iconName: "icon-bookmark",
      label: "Default Order Saved",
      iconColorAlias: "orange"
    }
  }
], d = [
  ...o,
  ...s,
  ...l,
  ...m,
  ...r,
  ...S,
  ...c
];
export {
  d as manifests
};
//# sourceMappingURL=oc-power-sorting.js.map
