using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace OC.PowerSort
{
    public class Constants
    {
        public const string ApiName = "ocPowerSort";

        public static class Conventions
        {
            public static class Flags
            {
                // Power Sorting specific flags - using Umbraco's flag prefix convention
                public const string CustomSorted = UmbracoConstants.Conventions.Flags.Prefix + "OC.PowerSort.CustomSorted";
                public const string HasSchedule = UmbracoConstants.Conventions.Flags.Prefix + "OC.PowerSort.HasSchedule";
                public const string HasDefaultOrder = UmbracoConstants.Conventions.Flags.Prefix + "OC.PowerSort.HasDefaultOrder";
            }
        }
    }
}
