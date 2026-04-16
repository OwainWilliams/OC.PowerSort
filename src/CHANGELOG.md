# Changelog

All notable changes to OC.PowerSort will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Provider System**: Extensible architecture allowing third-party developers to create custom sorting strategies
  - `ISortProvider` interface for implementing custom sort logic
  - `ISortProviderFactory` for provider discovery and management
  - `DefaultScheduleSortProvider` implementing existing schedule-based sorting (backward compatible)
  - Example providers demonstrating PowerSort-specific use cases:
    - `FeaturedContentBoostProvider` - Boosts featured content while respecting schedules
    - `PopularityBoostProvider` - Boosts content by view count, with schedule overrides
  - Comprehensive provider development documentation
- **Unit Tests**: Complete test coverage for provider system (90 tests, 100% passing)
  - `DefaultScheduleSortProviderTests` (23 tests)
  - `SortProviderFactoryTests` (15 tests)
  - `FeaturedContentBoostProviderTests` (10 tests) - Schedule-aware boosting tests
  - `PopularityBoostProviderTests` (11 tests) - Analytics integration with schedules
- Recurring schedule support for automated content sorting
- Recurring schedule API endpoints
- Schedule occurrence tracking and generation
- Recurrence calculator service for handling complex recurring patterns

### Changed
- `ScheduleProcessingService` now uses provider system for sort calculations
- Provider-based sorting maintains full backward compatibility with existing schedules
- Example providers now demonstrate **schedule-aware boosting** (PowerSort's core strength) rather than generic sorting

### Fixed
- Null key handling in `SortProviderFactory.GetProvider()`
- Empty children handling in provider metadata calculation

### Technical
- New namespace: `OC.PowerSort.Providers` for provider implementations
- New namespace: `OC.PowerSort.Providers.Examples` for reference providers
- New service: `SortProviderFactory` registered as singleton
- Enhanced logging in sort operations with provider metadata
- All example providers now demonstrate `SupportsScheduling = true` pattern

### Fixed
- API response handling to prevent "body stream already read" errors
- MenuItems API controller authorization logic
- Cross-database migration compatibility for SQLite and SQL Server
- SQLite ALTER TABLE operations in migrations
- Foreign key creation handling for SQLite databases

## [17.1.0] - 2026-03-18

### Added
- Enhanced sorting capabilities for content nodes
- Schedule processing service for automated sorting
- Default sort order functionality
- Priority-based sorting when multiple items share the same sort order

### Changed
- Migrated all migrations to AsyncMigrationBase for Umbraco 17 compatibility
- Improved backoffice integration

## [17.0.2-alpha003] - 2026-04-12

### Added
- Recurring schedules feature completion
- Comprehensive database migration system

### Fixed
- Migration execution issues
- Database compatibility issues between SQLite and SQL Server
- Formatting and merge conflicts

## [17.0.2-alpha002] - 2026-03-18

### Changed
- Enhanced release workflow with Node.js setup
- Improved package build process

## [17.0.2-alpha001] - 2026-03-18

### Added
- Initial alpha release for Umbraco 17
- Auto version numbering system

## [17.0.1] - 2026-03-17

### Added
- Initial stable release for Umbraco 17
- PowerSort section in Umbraco backoffice
- Drag-and-drop sorting interface
- Schedule-based sorting capabilities
- Content flags for sorted items and scheduled content
- Flag provider integration with Umbraco

### Changed
- Updated to support Umbraco v17+ and .NET 10
- Modernized API architecture using Management API

## [17.0.0] - 2026-03-XX

### Added
- First version compatible with Umbraco 17
- Backoffice section for PowerSort
- Enhanced sorting options for content nodes
- User group permission management
- Database migrations for sort schedules, recurring schedules, and default sort orders

### Features
- **Manual Sorting**: Drag-and-drop interface for immediate content reordering
- **Scheduled Sorting**: Schedule specific sort orders to activate at future dates/times
- **Recurring Schedules**: Set up recurring sort patterns (daily, weekly, monthly, yearly)
- **Default Sort Order**: Save and restore default sorting configurations
- **Priority System**: Handle conflicts when multiple items have the same sort order
- **Menu Item Management**: Save frequently used parent nodes for quick access
- **Content Flags**: Visual indicators in content tree for sorted/scheduled items

## [1.0.4-beta] - Previous Generation

### Note
Legacy version for older Umbraco releases (pre-v17). See git tags for details.

## [1.0.3-beta] - Previous Generation

### Note
Legacy version for older Umbraco releases (pre-v17). See git tags for details.

## [1.0.2] - Previous Generation

### Note
Legacy version for older Umbraco releases (pre-v17). See git tags for details.

## [1.0.1] - Previous Generation

### Note
Legacy version for older Umbraco releases (pre-v17). See git tags for details.

---

## Key Features Overview

### Sorting Capabilities
- **Drag-and-Drop Sorting**: Intuitive interface for manual content reordering
- **Scheduled Sorting**: Plan content order changes in advance
- **Recurring Schedules**: Automate repetitive sorting patterns
- **Priority-Based Resolution**: Handle sort order conflicts intelligently

### Database Support
- SQL Server (recommended)
- SQLite (for development/testing)
- Cross-database migration compatibility

### API Endpoints
- `/umbraco/management/api/v1/oc/power-sort/menu-items` - Menu item management
- `/umbraco/management/api/v1/oc/power-sort/children/{id}` - Get sortable children
- `/umbraco/management/api/v1/oc/power-sort/sort/document` - Apply sort order
- `/umbraco/management/api/v1/oc/power-sort/schedules` - Schedule management
- `/umbraco/management/api/v1/oc/power-sort/schedules/active` - Active schedules
- `/umbraco/management/api/v1/oc/power-sort/default-sort-order` - Default order management
- `/umbraco/management/api/v1/oc/power-sort/enum-priorities` - Priority management

### Requirements
- Umbraco CMS v17.0.0 or higher
- .NET 10
- SQL Server or SQLite database

---

## Migration Notes

### From v1.x to v17.0.0
This is a major version upgrade aligning with Umbraco 17. The package has been completely rewritten to use modern Umbraco APIs:
- Migrated from legacy APIs to Umbraco Management API
- Updated to .NET 10
- New backoffice section implementation
- Enhanced database schema with migrations
- Added recurring schedule support

### Database Migrations
The package automatically handles database schema creation and updates through Umbraco's migration system:
- `CreateSortScheduleTableMigration` - Core scheduling table
- `CreateRecurringScheduleTableMigration` - Recurring schedule support
- `CreateScheduleOccurrenceTableMigration` - Occurrence tracking
- `CreateDefaultSortOrderTableMigration` - Default order storage
- `CreateEnumPriorityTableMigration` - Priority management
- `AddRecurringScheduleIdToScheduleMigration` - Schema enhancement

All migrations are compatible with both SQL Server and SQLite.

---

## Contributors
- [Owain Williams](https://github.com/OwainWilliams)
- [Harrie Mayhew](https://github.com/mayhemcreates)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
