import { UMB_DOCUMENT_ENTITY_TYPE as i } from "@umbraco-cms/backoffice/document";
const t = class t {
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
t.SECTION_ALIAS = "OC.PowerSorting.Section";
let a = t;
const n = [
  a.createEntrypointManifest({
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSorting.Entrypoint",
    jsImport: () => import("./entrypoint-CUHy5R0W.js")
  })
], o = [
  a.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSorting.Section",
    label: "Power Sort",
    pathname: "power-sort"
  }),
  a.createSectionViewManifest({
    name: "Power Sort Section View",
    alias: "OC.PowerSorting.SectionView",
    label: "Power Sort",
    pathname: "view",
    icon: "icon-sort",
    jsImport: () => import("./section-view.element-B1ICiDDx.js")
  }),
  {
    type: "entitySign",
    kind: "icon",
    alias: "Umb.EntitySign.Document.My.Locked",
    name: "Is Locked Document Entity Sign",
    // Specifying which enties can show this sign, documents
    forEntityTypes: [i],
    // Specify what entities should be "flagged" with to make the sign show
    forEntityFlags: ["Umb.My.Locked"],
    // Can only show 2 icons at once, so the weighting matters. `-1000` means this one is really unimportant!
    weight: -1e3,
    meta: {
      // Specifying what the sign looks like
      iconName: "icon-lock",
      label: "Locked",
      iconColorAlias: "red"
    }
    // You'll notice we don't link to a TS file! Flagging is purely a C# concern
  }
], r = [
  a.createDashboardManifest({
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSorting-Dashboard",
    label: "Power Sort Dashboard",
    pathname: "power-sort-dashboard",
    jsImport: () => import("./powersort.element-CVh5Glte.js")
  })
], s = [
  a.createDashboardManifest({
    name: "OCPower Sorting Children Dashboard",
    alias: "OC.PowerSorting-Children-Dashboard",
    label: "Sort Children",
    pathname: "power-sort-children/:id",
    jsImport: () => import("./children.element-BSwuSelv.js")
  })
], m = [
  a.createDashboardManifest({
    name: "OCPower Sorting Schedules Dashboard",
    alias: "OC.PowerSorting-Schedules-Dashboard",
    label: "Manage Schedules",
    pathname: "power-sort-schedules/:id",
    jsImport: () => import("./schedules.element-BUjuXvxq.js")
  })
], l = [
  a.createSidebarAppManifest({
    name: "My Section Sidebar App",
    alias: "OC.PowerSorting.SectionSidebar",
    label: "Power Sorting Sidebar",
    icon: "icon-sort",
    jsImport: () => import("./sidebar-app.element-8f7FsdQx.js"),
    menus: ["OC.PowerSorting.Menu"]
  })
], c = [
  ...n,
  ...r,
  ...s,
  ...m,
  ...o,
  ...l
];
export {
  c as manifests
};
//# sourceMappingURL=oc-power-sorting.js.map
