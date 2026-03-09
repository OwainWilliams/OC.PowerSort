using Asp.Versioning;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using OC.PowerSort.FlagProvider;
using OC.PowerSort.Interfaces;
using OC.PowerSort.Services;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Api.Management.Services.Flags;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace OC.PowerSort.Composers
{
    public class OCPowerSortApiComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Add controllers to MVC
            builder.Services.AddControllers()
                .AddApplicationPart(typeof(OCPowerSortApiComposer).Assembly);

            builder.Services.AddSingleton<IOperationIdHandler, CustomOperationHandler>();

            // Register background service for schedule processing
            builder.Services.AddHostedService<ScheduleProcessingService>();

            // Register sorting flag service as singleton 
            // (must match FlagProvider lifetime which is registered as Singleton by FlagProviderCollectionBuilder)
            builder.Services.AddSingleton<ISortingFlagService, SortingFlagService>();

            // Register flag provider using Umbraco's collection builder pattern
            // This is the correct way to register IFlagProvider implementations in Umbraco
            builder.WithCollectionBuilder<FlagProviderCollectionBuilder>()
                .Append<SortingFlagProvider>();

            builder.Services.Configure<SwaggerGenOptions>(opt =>
            {
                opt.SwaggerDoc(Constants.ApiName, new OpenApiInfo
                {
                    Title = "OCPower Sorting Backoffice API",
                    Version = "1.0",
                });

                opt.OperationFilter<OCPowerSortOperationSecurityFilter>();
            });
        }

        public class OCPowerSortOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
        {
            protected override string ApiName => Constants.ApiName;
        }

        public class CustomOperationHandler : OperationIdHandler
        {
            public CustomOperationHandler(IOptions<ApiVersioningOptions> apiVersioningOptions) : base(apiVersioningOptions)
            {
            }

            protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
            {
                return controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith("OC.PowerSort.Controllers", comparisonType: StringComparison.InvariantCultureIgnoreCase) is true;
            }

            public override string Handle(ApiDescription apiDescription) => $"{apiDescription.ActionDescriptor.RouteValues["action"]}";
        }
    }

}
