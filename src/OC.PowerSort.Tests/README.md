# OC.PowerSort Tests

This project contains unit tests for the PowerSort functionality using NUnit.

## Test Structure

- **Services/ScheduleProcessingServiceTests.cs** - Tests for schedule activation, deactivation, and priority handling
- **Services/SortingFlagServiceTests.cs** - Tests for active schedule detection, default sort order detection, and custom sort order detection
- **Models/SortOrderLogicTests.cs** - Tests for schedule time windows, default sort order positions, and multiple schedule ordering

## Running Tests

### Visual Studio
1. Open Test Explorer (Test > Test Explorer)
2. Click "Run All" to execute all tests
3. View results in the Test Explorer window

### Command Line
```bash
dotnet test
```

### With Code Coverage
```bash
dotnet test /p:CollectCoverage=true
```

## Key Testing Scenarios

### Schedule Processing
- Schedule activation when start time is reached
- Schedule deactivation when end time is reached
- Priority handling for multiple active schedules

### Sorting Flags
- Detection of active schedules
- Detection of default sort orders
- Detection of custom sort orders

### Sort Order Logic
- Time window validation for schedules
- Default sort order position maintenance
- Multiple schedule ordering by priority and start time

## Dependencies

- **NUnit 4.3.0** - Test framework
- **Moq 4.20.72** - Mocking framework
- **FluentAssertions 7.0.0** - Assertion library for more readable tests
