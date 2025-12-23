export const manifests: Array<UmbExtensionManifest> = [
  {
    "type": "sectionSidebarApp",
    "alias": "OC.PowerSorting.SectionSidebar",
    "name": "My Section Sidebar App",
    "element": () => import('./sidebar-app.element.js'),
    "conditions": [{
      "alias": "Umb.Condition.SectionAlias",
      "match": "OC.PowerSorting.Section"
    }],
    meta: {
      "label": "Power Sorting Sidebar",
      "icon": "icon-sort",
      "menus": ["OC.PowerSorting.Menu"]
    }
  },
 
  
];
