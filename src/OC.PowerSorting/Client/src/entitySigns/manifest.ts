import { UMB_DOCUMENT_ENTITY_TYPE } from '@umbraco-cms/backoffice/document';

// Flag values must match what the server adds
// The Umbraco.Cms.Core.Constants.Conventions.Flags.Prefix is "Umb."
const FLAGS_PREFIX = 'Umb.';

export const entitySignManifests: Array<UmbExtensionManifest> = [
  // Custom Sorted Flag - Shows when document has been manually sorted
  {
    type: 'entitySign',
    kind: 'icon',
    alias: 'OC.PowerSort.EntitySign.CustomSorted',
    name: 'Custom Sorted Document Entity Sign',
    // Specifying which entities can show this sign
    forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
    // Specify what entities should be "flagged" to make the sign show
    // Must match the flag added by the server-side IFlagProvider
    forEntityFlags: [`${FLAGS_PREFIX}OC.PowerSort.CustomSorted`],
    weight: 100,
    meta: {
      // Specifying what the sign looks like
      iconName: 'icon-lab',
      label: 'Custom Sorted',
      iconColorAlias: 'blue',
    }
  },
  
  // Active Schedule Flag - Shows when document has active schedules
  {
    type: 'entitySign',
    kind: 'icon',
    alias: 'OC.PowerSort.EntitySign.HasSchedule',
    name: 'Has Active Schedule Entity Sign',
    forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
    forEntityFlags: [`${FLAGS_PREFIX}OC.PowerSort.HasSchedule`],
    weight: 200,
    meta: {
      iconName: 'icon-calendar',
      label: 'Scheduled',
      iconColorAlias: 'green',
    }
  },
  
  // Has Default Order Flag - Shows when document is parent with default order
  {
    type: 'entitySign',
    kind: 'icon',
    alias: 'OC.PowerSort.EntitySign.HasDefaultOrder',
    name: 'Has Default Order Entity Sign',
    forEntityTypes: [UMB_DOCUMENT_ENTITY_TYPE],
    forEntityFlags: [`${FLAGS_PREFIX}OC.PowerSort.HasDefaultOrder`],
    weight: 150,
    meta: {
      iconName: 'icon-bookmark',
      label: 'Default Order Saved',
      iconColorAlias: 'orange',
    }
  }
];
