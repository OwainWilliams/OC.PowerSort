# <img alt="OC.PowerSort Logo" src="https://github.com/OwainWilliams/OC.PowerSort/blob/main/assets/ocPowerSortLogo.png" style="width: 50px;">OC.PowerSort

[![Downloads](https://img.shields.io/nuget/dt/OC.PowerSort?color=cc9900)](https://www.nuget.org/packages/OC.PowerSort/)
[![NuGet](https://img.shields.io/nuget/vpre/OC.PowerSort?color=0273B3)](https://www.nuget.org/packages/OC.PowerSort/)
[![GitHub license](https://img.shields.io/github/license/OwainWilliams/OC.PowerSort?color=8AB803)](../LICENSE)



A powerful sorting extension for Umbraco CMS that provides enhanced sorting capabilities for content nodes in the backoffice.


## Features

- Enhanced sorting options for Umbraco content nodes
- Easy-to-use backoffice integration
- Compatible with Umbraco v17+

## Installation

Add the package to an existing Umbraco website (v17+) from nuget:

`dotnet add package OC.PowerSort`

## Usage

Once the package is installed, before it will show in the backoffice, you need to allow the section in the user groups that you want to have access to it. To do this:
1. Navigate to the "Users" section in your Umbraco backoffice
2. Select the user group you want to grant access to
3. In the "Sections" tab, check the box for "PowerSort"
4. Save the changes
5. Refresh your backoffice to see the new section available for users in that group

Once this is done, the package will automatically integrate with your Umbraco backoffice.

1. Navigate to the PowerSort section in your Umbraco backoffice
2. Select the parent node containing the items you want to sort
3. Use the PowerSort action to access advanced sorting options
4. Choose your sorting criteria and apply the changes


### Video Demonstration

#### Basic usage
[![Basic Setup](https://img.youtube.com/vi/eeddTabJyII/0.jpg)](https://www.youtube.com/watch?v=eeddTabJyII)

#### Set Default Sort Order
[![Default Sort Order](https://img.youtube.com/vi/UVH7d-s_1nk/0.jpg)](https://www.youtube.com/watch?v=UVH7d-s_1nk)

#### Setup Schedules 
[![Setup Schedules](https://img.youtube.com/vi/wg4VjALjMSs/0.jpg)](https://www.youtube.com/watch?v=wg4VjALjMSs)


## Configuration

No additional configuration is required other than granting access to the section for the relevant user groups as described in the usage section. The package will automatically integrate with your Umbraco backoffice and provide enhanced sorting capabilities for content nodes.

## Requirements

- Umbraco v17+
- .NET 10

## Contributing

Contributions to this package are most welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md).

## Acknowledgments

This package has been created by [Owain Williams](https://github.com/OwainWilliams/) and [Harrie Mayhew](https://github.com/mayhemcreates). It is licensed under the MIT License (see [LICENSE](../LICENSE) for details).
