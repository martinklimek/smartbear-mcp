# BitBar Client

This module provides BitBar integration for the SmartBear MCP Server, enabling interaction with BitBar's mobile and web testing platform through its REST API.

## Overview

BitBar is SmartBear's cloud-based testing platform that provides access to real mobile devices and browsers for testing mobile applications and web applications. This client provides comprehensive access to BitBar's capabilities through MCP tools.

## Authentication

BitBar uses API key authentication. You need to:

1. Log into your BitBar account
2. Navigate to My Account > My Integrations > API
3. Copy your API key
4. Set the `BITBAR_API_KEY` environment variable

## Available Tools

### User Management
- `bitbar_get_user` - Get current user information and account details

### Project Management
- `bitbar_list_projects` - List all projects in your account
- `bitbar_get_project` - Get details of a specific project
- `bitbar_create_project` - Create a new project
- `bitbar_update_project` - Update an existing project

### Device Management
- `bitbar_list_devices` - List all available devices in the cloud
- `bitbar_list_device_groups` - List your device groups
- `bitbar_get_device_group` - Get details of a specific device group

### File Management
- `bitbar_list_files` - List all uploaded files
- `bitbar_get_file` - Get details of a specific file

### Testing Framework Management
- `bitbar_list_frameworks` - List all available testing frameworks

### Test Execution
- `bitbar_create_test_run` - Create and start a new test run
- `bitbar_list_test_runs` - List test runs (all or for a specific project)
- `bitbar_get_test_run` - Get details and status of a test run
- `bitbar_abort_test_run` - Abort a running test

### Device Session Management
- `bitbar_list_device_sessions` - List device sessions for a test run
- `bitbar_get_device_session` - Get details of a specific device session

## Usage Examples

### Basic Project Management
```typescript
// List all projects
const projects = await bitbarClient.listProjects();

// Create a new project
const newProject = await bitbarClient.createProject({
  name: "My Mobile App Tests",
  description: "Automated tests for my mobile application"
});

// Get project details
const projectDetails = await bitbarClient.getProject(projectId);
```

### Test Execution Workflow
```typescript
// 1. List available frameworks
const frameworks = await bitbarClient.listFrameworks();

// 2. List device groups
const deviceGroups = await bitbarClient.listDeviceGroups();

// 3. Create and start a test run
const testRun = await bitbarClient.createTestRun({
  osType: "ANDROID",
  projectId: "12345",
  files: [
    { id: "app-file-id", action: "INSTALL" },
    { id: "test-file-id", action: "RUN_TEST" }
  ],
  frameworkId: "framework-id",
  deviceGroupId: "device-group-id",
  testRunName: "Automated Test Run",
  scheduler: "PARALLEL"
});

// 4. Monitor test progress
const testStatus = await bitbarClient.getTestRun(testRun.id);

// 5. Get device sessions
const sessions = await bitbarClient.listDeviceSessions(testRun.id);
```

## Test Run Configuration

When creating a test run, you need to provide:

### Required Parameters
- `osType`: Target OS ("ANDROID", "IOS", or "DESKTOP")
- `projectId`: ID of the project to run tests in
- `files`: Array of file configurations with IDs and actions
- `frameworkId`: ID of the testing framework to use
- Either `deviceGroupId` or `deviceIds`: Target devices for testing

### Optional Parameters
- `testRunName`: Custom name for the test run
- `scheduler`: Execution strategy (PARALLEL, SERIAL, SINGLE, ALL_INSTANCES)
- `timeout`: Maximum execution time
- `videoRecordingEnabled`: Whether to record device videos
- `screenshotDir`: Directory for screenshots
- `maxAutoRetriesCount`: Number of automatic retries on failure
- `hookURL`: Webhook URL for notifications

## File Actions

When specifying files in a test run, you can set actions:
- `COPY_TO_DEVICE`: Copy file to device storage
- `INSTALL`: Install the file (for APK/IPA files)  
- `RUN_TEST`: Execute the file as a test

## Error Handling

The client includes comprehensive error handling for:
- Authentication failures
- Missing required parameters
- API rate limits
- Network connectivity issues
- Invalid resource IDs

## API Base URL

The client uses `https://cloud.bitbar.com/api` as the base URL. For Private Cloud or On-Premise installations, this would need to be modified to point to your specific BitBar instance.

## Limitations

- File uploads are not currently implemented (would require multipart/form-data handling)
- Some advanced configuration options for specific frameworks may not be exposed
- Real-time streaming of test results is not supported (polling required)

## Future Enhancements

Potential additions could include:
- File upload capabilities
- Real-time test result streaming
- Device session control (screenshots, videos)
- Advanced filtering and sorting options
- Integration with CI/CD pipelines
- Test result analysis and reporting
