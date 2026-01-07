/**
 * Factory utilities for creating consistent manifests
 */

export interface DashboardManifestConfig {
  name: string;
  alias: string;
  label: string;
  pathname: string;
  jsImport: () => Promise<any>;
}

export interface SectionManifestConfig {
  name: string;
  alias: string;
  label: string;
  pathname: string;
  weight?: number;
}

export interface SectionViewManifestConfig {
  name: string;
  alias: string;
  label: string;
  pathname: string;
  icon: string;
  jsImport: () => Promise<any>;
  weight?: number;
}

export class ManifestFactory {
  private static readonly SECTION_ALIAS = "OC.PowerSorting.Section";

  /**
   * Create dashboard manifest with consistent structure
   */
  static createDashboardManifest(config: DashboardManifestConfig): UmbExtensionManifest {
    return {
      name: config.name,
      alias: config.alias,
      type: "dashboard",
      js: config.jsImport,
      meta: {
        label: config.label,
        pathname: config.pathname,
      },
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS,
        },
      ],
    };
  }

  /**
   * Create section manifest
   */
  static createSectionManifest(config: SectionManifestConfig): UmbExtensionManifest {
    return {
      type: "section",
      alias: config.alias,
      name: config.name,
      weight: config.weight ?? 100,
      meta: {
        label: config.label,
        pathname: config.pathname,
      },
    };
  }

  /**
   * Create section view manifest
   */
  static createSectionViewManifest(config: SectionViewManifestConfig): UmbExtensionManifest {
    return {
      type: "sectionView",
      alias: config.alias,
      name: config.name,
      js: config.jsImport,
      weight: config.weight ?? 200,
      meta: {
        label: config.label,
        pathname: config.pathname,
        icon: config.icon,
      },
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS,
        },
      ],
    };
  }

  /**
   * Create sidebar app manifest
   */
  static createSidebarAppManifest(config: {
    name: string;
    alias: string;
    label: string;
    icon: string;
    jsImport: () => Promise<any>;
    menus?: string[];
  }): UmbExtensionManifest {
    return {
      type: "sectionSidebarApp",
      alias: config.alias,
      name: config.name,
      element: config.jsImport,
      conditions: [
        {
          alias: "Umb.Condition.SectionAlias",
          match: this.SECTION_ALIAS,
        }
      ],
      meta: {
        label: config.label,
        icon: config.icon,
        menus: config.menus || []
      }
    };
  }

  /**
   * Create entrypoint manifest
   */
  static createEntrypointManifest(config: {
    name: string;
    alias: string;
    jsImport: () => Promise<any>;
  }): UmbExtensionManifest {
    return {
      name: config.name,
      alias: config.alias,
      type: "backofficeEntryPoint",
      js: config.jsImport,
    };
  }
}
