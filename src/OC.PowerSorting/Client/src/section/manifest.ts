import { UMB_DOCUMENT_ENTITY_TYPE } from '@umbraco-cms/backoffice/document';
import { ManifestFactory } from '../utils/manifest.factory.js';

export const manifests: Array<UmbExtensionManifest> = [
  ManifestFactory.createSectionManifest({
    name: "Power Sort Section",
    alias: "OC.PowerSorting.Section",
    label: "Power Sort",
    pathname: "power-sort",
  }),
  
  ManifestFactory.createSectionViewManifest({
    name: "Power Sort Section View",
    alias: "OC.PowerSorting.SectionView",
    label: "Power Sort",
    pathname: "view",
    icon: "icon-sort",
    jsImport: () => import("./section-view.element.js"),
  }),
  {
    type: 'entitySign',
    kind: 'icon',
    alias: 'Umb.EntitySign.Document.My.Locked',
    name: 'Is Locked Document Entity Sign',
    // Specifying which enties can show this sign, documents
    forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
    // Specify what entities should be "flagged" with to make the sign show
    forEntityFlags: ['Umb.My.Locked'],
    // Can only show 2 icons at once, so the weighting matters. `-1000` means this one is really unimportant!
    weight: -1000,
    meta: {
      // Specifying what the sign looks like
      iconName: 'icon-lock',
      label: 'Locked',
      iconColorAlias: 'red',
    }
    // You'll notice we don't link to a TS file! Flagging is purely a C# concern
  },
];
