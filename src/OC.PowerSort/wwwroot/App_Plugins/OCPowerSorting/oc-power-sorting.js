import { UMB_DOCUMENT_ENTITY_TYPE as a } from "@umbraco-cms/backoffice/document";
const n = class n {
  /**
   * Create dashboard manifest with consistent structure
   */
  static createDashboardManifest(t) {
    return {
      name: t.name,
      alias: t.alias,
      type: "dashboard",
      js: t.jsImport,
      meta: {
        label: t.label,
        pathname: t.pathname
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
  static createSectionManifest(t) {
    return {
      type: "section",
      alias: t.alias,
      name: t.name,
      weight: t.weight ?? 100,
      meta: {
        label: t.label,
        pathname: t.pathname
      }
    };
  }
  /**
   * Create section view manifest
   */
  static createSectionViewManifest(t) {
    return {
      type: "sectionView",
      alias: t.alias,
      name: t.name,
      js: t.jsImport,
      weight: t.weight ?? 200,
      meta: {
        label: t.label,
        pathname: t.pathname,
        icon: t.icon
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
  static createSidebarAppManifest(t) {
    return {
      type: "sectionSidebarApp",
      alias: t.alias,
      name: t.name,
      element: t.jsImport,
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS
        }
      ],
      meta: {
        label: t.label,
        icon: t.icon,
        menus: t.menus || []
      }
    };
  }
  /**
   * Create entrypoint manifest
   */
  static createEntrypointManifest(t) {
    return {
      name: t.name,
      alias: t.alias,
      type: "backofficeEntryPoint",
      js: t.jsImport
    };
  }
};
n.SECTION_ALIAS = "OC.PowerSort.Section";
let e = n;
const o = [
  e.createEntrypointManifest({
    name: "OCPower Sorting Entrypoint",
    alias: "OC.PowerSort.Entrypoint",
    jsImport: () => import("./entrypoint-CUHy5R0W.js")
  })
], r = [
  e.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSort.Section",
    label: "Power Sort",
    pathname: "power-sort"
  })
  // Section view removed - content is accessed contextually through dashboards
  // Users interact with Children/Schedules by clicking nodes in the tree or sidebar
  // If you need the Enum Priorities view, you can convert it to a dashboard instead
], s = [
  // Main dashboard - handles all views (main, children, schedules) through conditional rendering
  // The powersort.element component detects the current route and renders the appropriate view
  e.createDashboardManifest({
    name: "OCPower Sorting Dashboard",
    alias: "OC.PowerSort-Dashboard",
    label: "Power Sort",
    pathname: "power-sort-dashboard",
    jsImport: () => import("./powersort.element-Bkbi62iq.js")
  })
], l = [
  e.createSidebarAppManifest({
    name: "My Section Sidebar App",
    alias: "OC.PowerSort.SectionSidebar",
    label: "Power Sorting Sidebar",
    icon: "icon-sort",
    jsImport: () => import("./sidebar-app.element-DrKhqcdE.js"),
    menus: ["OC.PowerSort.Menu"]
  })
], i = "Umb.", m = [
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
], c = [
  ...o,
  ...s,
  // Main PowerSort dashboard - conditionally renders Children/Schedules
  ...r,
  ...l,
  ...m
];
export {
  c as manifests
};
//# sourceMappingURL=oc-power-sort.js.map
