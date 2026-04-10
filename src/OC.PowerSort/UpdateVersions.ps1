<#
.SYNOPSIS
    Automatically syncs the version number from OC.PowerSort.csproj to package.json files.

.DESCRIPTION
    This script is called automatically during the build process (BeforeBuild target in .csproj).
    It ensures that the version in Client/package.json and Client/public/umbraco-package.json
    stays in sync with the version defined in OC.PowerSort.csproj.

    You only need to update the version in ONE place: OC.PowerSort.csproj
    The other files will be updated automatically when you build.

.PARAMETER Version
    The version string to set in the JSON files (passed from MSBuild).

.EXAMPLE
    .\UpdateVersions.ps1 -Version "17.1.0"
#>

param(
    [string]$Version
)

$ErrorActionPreference = "Stop"

function Update-JsonVersion {
    param(
        [string]$FilePath,
        [string]$Version
    )

    if (Test-Path $FilePath) {
        try {
            $content = Get-Content $FilePath -Raw -Encoding UTF8
            # Use regex to replace the version value
            $pattern = '"version"\s*:\s*"[^"]*"'
            $replacement = '"version": "' + $Version + '"'
            $updatedContent = $content -replace $pattern, $replacement
            Set-Content -Path $FilePath -Value $updatedContent -Encoding UTF8 -NoNewline
            Write-Host "Updated version in $FilePath to $Version"
        }
        catch {
            Write-Error "Failed to update $FilePath : $_"
            exit 1
        }
    }
    else {
        Write-Warning "File not found: $FilePath"
    }
}

# Update package.json
$packageJsonPath = Join-Path $PSScriptRoot "Client\package.json"
Update-JsonVersion -FilePath $packageJsonPath -Version $Version

# Update umbraco-package.json
$umbracoPackageJsonPath = Join-Path $PSScriptRoot "Client\public\umbraco-package.json"
Update-JsonVersion -FilePath $umbracoPackageJsonPath -Version $Version

Write-Host "Version sync completed successfully"



