import { z } from "zod";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client } from "../common/types.js";

// Type definitions for tool arguments
export interface ProjectArgs {
  projectId: string;
}

export interface CreateProjectArgs {
  name?: string;
  description?: string;
  archivingStrategy?: string;
  archivingItemCount?: number;
}

export interface UpdateProjectArgs {
  name?: string;
  description?: string;
  archivingStrategy?: string;
  archivingItemCount?: number;
}

export interface DeviceGroupArgs {
  deviceGroupId: string;
}

export interface FileArgs {
  fileId: string;
}

export interface UploadFileArgs {
  filename: string;
  fileContent: string; // base64 encoded content
  contentType?: string; // MIME type
}

export interface TestRunArgs {
  runId: string;
}

export interface CreateTestRunArgs {
  osType: "ANDROID" | "IOS" | "DESKTOP";
  projectId: string;
  files: Array<{ id: string; action?: "COPY_TO_DEVICE" | "INSTALL" | "RUN_TEST" }>;
  frameworkId: string;
  deviceGroupId?: string;
  deviceIds?: string[];
  testRunName?: string;
  scheduler?: "PARALLEL" | "SERIAL" | "SINGLE" | "ALL_INSTANCES";
  timeout?: number;
  videoRecordingEnabled?: boolean;
  screenshotDir?: string;
  maxAutoRetriesCount?: number;
  hookURL?: string;
}

export interface DeviceSessionArgs {
  sessionId: string;
}

// BitBar API client implementing the Client interface
export class BitBarClient implements Client {
  private headers: { 
    "Authorization": string; 
    "User-Agent": string;
  };
  private baseUrl = "https://cloud.bitbar.com/api";

  constructor(apiKey: string) {
    // BitBar uses Basic Auth with API key as username and empty password
    const encoded = Buffer.from(`${apiKey}:`).toString('base64');
    this.headers = {
      "Authorization": `Basic ${encoded}`,
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  // Helper method to create FormData for file uploads
  private createFormData(filename: string, fileContent: string, contentType?: string): FormData {
    try {
      console.log('[BitBar FormData] Creating FormData for:', filename);
      console.log('[BitBar FormData] Content type:', contentType || 'application/octet-stream');
      console.log('[BitBar FormData] Content length (base64):', fileContent.length);
      
      // Add file size validation to prevent memory issues
      const maxFileSize = 100 * 1024 * 1024; // 100MB limit for base64 content
      if (fileContent.length > maxFileSize) {
        throw new Error(`File too large: ${fileContent.length} bytes (max: ${maxFileSize} bytes)`);
      }
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(fileContent)) {
        throw new Error('Invalid base64 content format');
      }
      
      // Decode base64 content to binary
      const binaryData = Buffer.from(fileContent, 'base64');
      console.log('[BitBar FormData] Binary data length:', binaryData.length);
      
      // Additional validation for decoded size
      if (binaryData.length > 50 * 1024 * 1024) { // 50MB limit for actual file
        throw new Error(`Decoded file too large: ${binaryData.length} bytes (max: 50MB)`);
      }
      
      // Create FormData and append the file data
      const formData = new FormData();
      
      // Create a Blob from the Buffer for Node.js compatibility
      const blob = new Blob([binaryData], { type: contentType || 'application/octet-stream' });
      console.log('[BitBar FormData] Blob created, size:', blob.size);
      
      // Append the file to FormData with filename
      formData.append('file', blob, filename);
      console.log('[BitBar FormData] FormData created successfully');
      
      return formData;
    } catch (error) {
      console.error('[BitBar FormData] Error creating FormData:', error);
      throw new Error(`Failed to create FormData: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to fetch all pages from a paginated endpoint
  private async fetchAllPages(endpoint: string, pageSize: number = 100): Promise<any> {
    const allItems: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${pageSize}&offset=${offset}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      
      const pageData = await response.json();
      
      if (pageData.data && Array.isArray(pageData.data)) {
        allItems.push(...pageData.data);
      }
      
      // Check if there are more pages
      hasMore = pageData.data && pageData.data.length === pageSize && offset + pageSize < pageData.total;
      offset += pageSize;
    }

    // Return the same structure as the original API but with all items
    return {
      data: allItems,
      total: allItems.length,
      limit: allItems.length,
      offset: 0,
      empty: allItems.length === 0
    };
  }

  // User/Account Methods
  async getUser(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  // Project Management Methods
  async listProjects(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/projects`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async getProject(projectId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/projects/${projectId}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async createProject(args: CreateProjectArgs): Promise<any> {
    const body = new URLSearchParams();
    if (args.name) body.append('name', args.name);
    if (args.description) body.append('description', args.description);
    if (args.archivingStrategy) body.append('archivingStrategy', args.archivingStrategy);
    if (args.archivingItemCount) body.append('archivingItemCount', args.archivingItemCount.toString());

    const response = await fetch(`${this.baseUrl}/me/projects`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return response.json();
  }

  async updateProject(projectId: string, args: UpdateProjectArgs): Promise<any> {
    const body = new URLSearchParams();
    if (args.name) body.append('name', args.name);
    if (args.description) body.append('description', args.description);
    if (args.archivingStrategy) body.append('archivingStrategy', args.archivingStrategy);
    if (args.archivingItemCount) body.append('archivingItemCount', args.archivingItemCount.toString());

    const response = await fetch(`${this.baseUrl}/me/projects/${projectId}`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return response.json();
  }

  // Device Management Methods
  async listDevices(): Promise<any> {
    return this.fetchAllPages('/devices');
  }

  async listDeviceGroups(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/device-groups`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async getDeviceGroup(deviceGroupId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/device-groups/${deviceGroupId}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  // File Management Methods
  async listFiles(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/files`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async getFile(fileId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/files/${fileId}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async uploadFile(args: UploadFileArgs): Promise<any> {
    try {
      console.log('[BitBar Upload] Starting upload process...');
      console.log('[BitBar Upload] Filename:', args.filename);
      console.log('[BitBar Upload] Content length:', args.fileContent?.length || 0);
      
      const formData = this.createFormData(args.filename, args.fileContent, args.contentType);
      console.log('[BitBar Upload] FormData created successfully');
      
      // For FormData uploads, we need to omit Content-Type header to let fetch set the boundary
      const { "Content-Type": _, ...headersWithoutContentType } = this.headers as any;
      console.log('[BitBar Upload] Headers prepared, starting fetch...');
      
      const response = await fetch(`${this.baseUrl}/me/files`, {
        method: "POST",
        headers: headersWithoutContentType,
        body: formData,
      });
      
      console.log('[BitBar Upload] Fetch completed, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[BitBar Upload] Error response:', errorText);
        throw new Error(`BitBar upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[BitBar Upload] Upload successful, file ID:', result.id);
      return result;
    } catch (error) {
      console.error('[BitBar Upload] Upload error:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/me/files/${fileId}/file`, {
      method: "GET",
      headers: this.headers,
    });
    return response.blob();
  }

  async updateFileName(fileId: string, filename: string): Promise<any> {
    const body = new URLSearchParams();
    body.append('name', filename);

    const response = await fetch(`${this.baseUrl}/me/files/${fileId}`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return response.json();
  }

  async updateFileContent(fileId: string, args: UploadFileArgs): Promise<any> {
    const formData = this.createFormData(args.filename, args.fileContent, args.contentType);
    
    // For FormData uploads, we need to omit Content-Type header to let fetch set the boundary
    const { "Content-Type": _, ...headersWithoutContentType } = this.headers as any;
    
    const response = await fetch(`${this.baseUrl}/me/files/${fileId}/file`, {
      method: "POST",
      headers: headersWithoutContentType,
      body: formData,
    });
    return response.json();
  }

  // Framework and Test Methods
  async listFrameworks(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/available-frameworks`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async createTestRun(args: CreateTestRunArgs): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/runs`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    return response.json();
  }

  async listTestRuns(projectId?: string): Promise<any> {
    const url = projectId 
      ? `${this.baseUrl}/me/projects/${projectId}/runs`
      : `${this.baseUrl}/me/runs`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async getTestRun(runId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/runs/${runId}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async abortTestRun(runId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/runs/${runId}/abort`, {
      method: "POST",
      headers: this.headers,
    });
    return response.json();
  }

  // Device Session Methods
  async listDeviceSessions(runId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/runs/${runId}/device-sessions`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async getDeviceSession(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/me/device-sessions/${sessionId}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  // Helper method to convert human-written test steps or JSON reproduction data to Appium code
  private convertHumanStepsToAppium(input: string, reproductionData?: any): string {
    console.log('[BitBar StepConverter] Converting steps to clean Appium code following user example format');
    
    try {
      // Check if we have structured reproduction data (from error-repro-details)
      if (reproductionData && reproductionData.reproduction_steps && Array.isArray(reproductionData.reproduction_steps)) {
        console.log('[BitBar StepConverter] Processing structured reproduction steps from error-repro-details');
        const steps = reproductionData.reproduction_steps;
        const appiumCode: string[] = [];
        
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const action = step.action || 'tap_element';
          const selector = step.appium_selector || '';
          const timestamp = step.timestamp || '';
          
          console.log(`[BitBar StepConverter] Processing step ${i + 1}: ${action} on ${selector}`);
          
          let appiumCommand = '';
          let elementName = '';
          let locatorCode = '';
          
          // Parse the selector to determine the appropriate Appium locator
          if (selector.includes('accessibility_id:')) {
            elementName = selector.replace('accessibility_id:', '');
            locatorCode = `driver.find_element(AppiumBy.ACCESSIBILITY_ID, "${elementName}")`;
          } else if (selector.includes('xpath:')) {
            const originalXpath = selector.replace('xpath:', '');
            // Extract element name from xpath for variable naming
            const nameMatch = originalXpath.match(/@name=['"]([^'"]+)['"]/);
            elementName = nameMatch ? nameMatch[1] : 'element';
            
            // Convert to contains approach for better compatibility
            // Example: xpath:About becomes //*[contains(@name, 'About')]
            let containsXpath;
            if (nameMatch) {
              containsXpath = `//*[contains(@name, '${nameMatch[1]}')]`;
            } else {
              // If no @name found, try to extract a text value or use original
              const textMatch = originalXpath.match(/text\(\)=['"]([^'"]+)['"]/);
              if (textMatch) {
                containsXpath = `//*[contains(text(), '${textMatch[1]}')]`;
                elementName = textMatch[1];
              } else {
                // Fallback to original xpath if no pattern matches
                containsXpath = originalXpath;
              }
            }
            
            locatorCode = `driver.find_element(AppiumBy.XPATH, "${containsXpath}")`;
          } else {
            // Default to accessibility ID
            elementName = selector || 'element';
            locatorCode = `driver.find_element(AppiumBy.ACCESSIBILITY_ID, "${elementName}")`;
          }
          
          // Generate clean step description matching the user's format
          const stepDescription = this.generateStepDescription(action, elementName);
          const variableName = elementName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
          
          // Generate the Appium code based on action type - matching user's clean format exactly
          appiumCommand = `# ${i + 1}. ${stepDescription}
            log("Step ${i + 1}: ${stepDescription}")
            ${variableName} = ${locatorCode}
            ${variableName}.click()
            driver.save_screenshot(self.screenshot_dir + "/step_${i + 1}_${this.sanitizeFilename(elementName)}.png")
            sleep(${this.getStepDelay(action)})`;
          
          if (appiumCommand) {
            appiumCode.push(appiumCommand);
          }
        }
        
        if (appiumCode.length === 0) {
          console.log('[BitBar StepConverter] No actionable steps found in reproduction data');
          return this.generateDefaultTestSteps();
        }
        
        // Add final success message
        appiumCode.push(`
            log("Test completed successfully!")`);
        
        const result = appiumCode.join('\n            \n');
        console.log(`[BitBar StepConverter] Generated ${steps.length} clean structured steps`);
        return result;
      }
      
      // Fallback to legacy human-written steps processing
      return this.convertLegacySteps(input);
      
    } catch (error) {
      console.error('[BitBar StepConverter] Error converting steps:', error);
      return this.generateDefaultTestSteps();
    }
  }
  
  // Helper method to generate step descriptions matching user's format
  private generateStepDescription(action: string, elementName: string): string {
    switch (action.toLowerCase()) {
      case 'tap_button':
        return `Tap on ${elementName} button`;
      case 'switch_tab':
        return `Navigate to ${elementName} tab`;
      case 'tap_cell':
        return `Tap on ${elementName} cell`;
      case 'verify_view':
        return `Verify ${elementName} view is displayed`;
      case 'enter_text':
        return `Enter text in ${elementName} field`;
      case 'toggle_switch':
        return `Toggle ${elementName} switch`;
      case 'swipe_screen':
        return `Scroll to find ${elementName}`;
      default:
        return `Tap ${elementName}`;
    }
  }
  
  // Helper method to get appropriate delay for different actions
  private getStepDelay(action: string): number {
    switch (action.toLowerCase()) {
      case 'switch_tab':
        return 3;
      case 'tap_button':
        return 2;
      case 'verify_view':
        return 2;
      case 'swipe_screen':
        return 2;
      default:
        return 2;
    }
  }
  
  // Helper method to sanitize filename
  private sanitizeFilename(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
  
  // Helper method for default test steps
  private generateDefaultTestSteps(): string {
    return `# Default iOS test steps - app launched and taking screenshot
            log("🚀 App launched successfully")
            log("📸 Taking screenshot: app_launch.png")
            driver.save_screenshot(self.screenshot_dir + "/app_launch.png")
            sleep(2)
            log("✅ Test completed successfully")`;
  }
  
  // Helper method to convert legacy steps
  private convertLegacySteps(input: string): string {
    if (!input || input.trim() === '') {
      console.log('[BitBar StepConverter] No input provided, using default steps');
      return this.generateDefaultTestSteps();
    }
    
    console.log('[BitBar StepConverter] Processing legacy human-written steps');
    
    // Split steps by numbered lines (1., 2., etc.) or newlines
    const steps = input
      .split(/\n|(?=\d+\.)/g)
      .map(step => step.trim())
      .filter(step => step.length > 0);
    
    const appiumCode: string[] = [];
    let stepNumber = 1;
    
    for (const step of steps) {
      // Remove step numbering if present (1., 2., etc.)
      const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
      if (!cleanStep) continue;
      
      console.log(`[BitBar StepConverter] Processing legacy step ${stepNumber}: ${cleanStep}`);
      
      let appiumCommand = `# ${stepNumber}. ${cleanStep}
            log("Step ${stepNumber}: ${cleanStep}")
            # Add your Appium code here for: ${cleanStep}
            driver.save_screenshot(self.screenshot_dir + "/step_${stepNumber}.png")
            sleep(2)`;
      
      appiumCode.push(appiumCommand);
      stepNumber++;
    }
    
    if (appiumCode.length === 0) {
      return this.generateDefaultTestSteps();
    }
    
    // Add final success message
    appiumCode.push(`
            log("Test completed successfully!")`);
    
    const result = appiumCode.join('\n            \n');
    console.log(`[BitBar StepConverter] Generated ${steps.length} legacy steps`);
    return result;
  }

  // Helper method to generate resource content based on resource type
  private async generateResourceContent(resourceType: string, uri: URL): Promise<string> {
    try {
      switch (resourceType) {
        case 'ios_test_requirements': {
          return `Appium-Python-Client==2.11.1
selenium==4.10.0
xmlrunner==1.7.7`;
        }
        
        case 'ios_test_run_tests_sh': {
          return `#!/bin/bash

# Name of the test file
TEST=\${TEST:="BitBarAppTest.py"}

echo "Extracting tests.zip..."
unzip -o tests.zip


#########################################################
#
# Installing required Python libraries
#  - required libraries are in requirement.txt file that
#    is uploaded with this script file
#
#########################################################

echo "Installing requirements from requirements.txt"
chmod 0444 requirements.txt
pip3 install -r requirements.txt

#########################################################
#
# Preparing to start Appium
# - UDID is the device ID on which test will run and
#   required parameter on iOS test runs
# - appium - is a wrapper tha calls the latest installed
#   Appium server. Additional parameters can be passed
#   to the server here.
#
#########################################################

echo "UDID set to \${IOS_UDID}"
echo "Starting Appium ..."
appium --log-no-colors --log-timestamp


#########################################################
#
# Setting of environment variables used later in test
# - used for Appium desired capabilities
# - note, APPIUM_URL is same for local and cloud server
#   runs
#########################################################
export APPIUM_APPFILE="\$PWD/application.ipa"
export APPIUM_URL="http://localhost:4723/wd/hub"
export APPIUM_DEVICE="Local Device"
export APPIUM_PLATFORM="IOS"
export APPIUM_AUTOMATION="XCUITest"

## Clean local screenshots directory
rm -rf screenshots

## Start test execution
echo "Running test \${TEST}"
python3 \${TEST}

#########################################################
#
# Get test report
# - do any test result post processing your test results
#   need here
# - also any additional files can be retrieved here
# - retrieve files from device
#
#########################################################
mv test-reports/*.xml TEST-all.xml`;
        }
        
        case 'ios_test_app_script': {
          const rawTestSteps = uri.searchParams.get('test_steps');
          const reproductionDataStr = uri.searchParams.get('reproduction_data');
          let reproductionData = null;
          let testSteps: string;
          
          // Try to parse reproduction data if provided
          if (reproductionDataStr) {
            try {
              reproductionData = JSON.parse(reproductionDataStr);
            } catch (error) {
              console.warn('[BitBar Resource] Failed to parse reproduction data:', error);
            }
          }
          
          if (rawTestSteps || reproductionData) {
            // Convert human-written steps or reproduction data to Appium code
            testSteps = this.convertHumanStepsToAppium(rawTestSteps || '', reproductionData);
          } else {
            // Default test steps
            testSteps = `# Default iOS test steps - launch app and take screenshot
            log("🚀 App launched successfully")
            log("📸 Taking screenshot: app_launch.png")
            driver.save_screenshot(self.screenshot_dir + "/app_launch.png")
            log("✅ Test completed successfully")`;
          }

          return `#
#  iOS Appium Test Script for BitBar (CORRECTED VERSION)
#

import unittest
from time import sleep

import xmlrunner
from appium.webdriver.common.appiumby import AppiumBy
from selenium.common.exceptions import WebDriverException

from BitBarAppiumTest import BitBarAppiumTest, log


class BitBarAppTest(BitBarAppiumTest):
    def setUp(self):
        # BitBarAppiumTest takes settings (local or cloud) from environment variables
        super(BitBarAppTest, self).setUp()

    # iOS Appium test
    def test_the_app(self):
        driver = self.get_driver()  # Initialize Appium connection to device

        sleep(10)  # Wait that the app loads
        log("Start iOS test!")
        
        # Use this to get detected screen hierarchy
        # print self.driver.page_source

        try:
${testSteps.split('\n').map(line => '            ' + line).join('\n')}
            
        except WebDriverException as e:
            log(f"iOS test run failed with WebDriverException: {e}")
            driver.save_screenshot(self.screenshot_dir + "/error_screenshot.png")
        except Exception as e:
            log(f"iOS test run failed with unexpected error: {e}")
            driver.save_screenshot(self.screenshot_dir + "/unexpected_error_screenshot.png")


if __name__ == '__main__':
    unittest.main(testRunner=xmlrunner.XMLTestRunner(output='test-reports'))`;
        }
        
        case 'ios_test_appium_script': {
          const bundleId = uri.searchParams.get('bundle_id');
          if (!bundleId) {
            throw new Error('bundle_id parameter is required for ios_test_appium_script resource');
          }

          return `# -*- coding: UTF-8 -*-

#
# Copyright(C) 2023 SmartBear Software
#
# iOS-specific Appium test base class for BitBar testing
#

import os
import pprint
import sys
import time
import unittest

from appium import webdriver


def log(msg):
    header = ''
    if os.environ.get('APPIUM_DEVICE'):
        header = f"[{os.environ.get('APPIUM_DEVICE')}]"
    print(f'{header} {time.strftime("%H:%M:%S")}: {msg}')
    sys.stdout.flush()


class BitBarAppiumTest(unittest.TestCase):
    # Appium for iOS testing
    driver = None
    platform_name = 'iOS'  # Fixed to iOS
    automation_name = 'XCUITest'  # Default iOS automation
    appium_url = None
    application_file = None
    device_name = None
    browser_name = None

    screenshot_dir = None
    # iOS specific - configurable bundle ID
    bundle_id = '${bundleId}'

    # Automatically resolved
    resolution = None

    def setUp(self, appium_url='http://localhost:4723/wd/hub', bundle_id='${bundleId}',
              application_file=None, browser_name=None, screenshot_dir=None,
              automation_name='XCUITest', noReset=None, fullReset=None):
        self.appium_url = os.environ.get('APPIUM_URL') or appium_url
        self.platform_name = 'iOS'  # Fixed to iOS

        self.bundle_id = bundle_id or os.environ.get('APPIUM_BUNDLEID') or '${bundleId}'

        self.automation_name = automation_name or os.environ.get('APPIUM_AUTOMATION') or 'XCUITest'

        self.application_file = application_file or os.environ.get('APPIUM_APPFILE')
        self.browser_name = browser_name or os.environ.get('APPIUM_BROWSER')

        self.device_name = os.environ.get('APPIUM_DEVICE') or self.device_name

        if screenshot_dir:
            self.set_screenshot_dir(screenshot_dir)
        else:
            self.set_screenshot_dir(f'{os.getcwd()}/screenshots')
        self.fullReset = fullReset or False
        self.noReset = noReset or True
        # Initialize WebDriver
        self.get_driver()

    def tearDown(self):
        self.driver.quit()

    def set_application_file(self, file):
        self.application_file = file

    def set_screenshot_dir(self, screenshot_dir):
        log(f'Will save screenshots at: {screenshot_dir}')
        self.screenshot_dir = screenshot_dir
        if not os.path.exists(screenshot_dir):
            log(f'Creating directory {screenshot_dir}')
            os.mkdir(self.screenshot_dir)

    def get_desired_capabilities(self):
        capabilities = {
            'platformName': 'iOS',
            'appium:automationName': self.automation_name,
            'appium:deviceName': self.device_name
        }
        if self.bundle_id:
            log(f'Using bundleId {self.bundle_id}')
            capabilities['appium:bundleId'] = self.bundle_id
        if self.application_file:
            log(f'Using application file {self.application_file}')
            capabilities['appium:app'] = self.application_file
        if self.browser_name:
            log(f'Using mobile browser {self.browser_name}')
            capabilities['browserName'] = self.browser_name

        log(pprint.pformat(capabilities))
        return capabilities

    def get_driver(self):
        if self.driver:
            return self.driver
            # set up WebDriver
        log(f'Connecting WebDriver to {self.appium_url}')
        self.driver = webdriver.Remote(self.appium_url, self.get_desired_capabilities())
        # Wait max 30 seconds for elements
        self.driver.implicitly_wait(30)

        log('WebDriver response received')
        return self.driver

    def isIOS(self):
        return True  # Always iOS for this test class`;
        }
        
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate ${resourceType} content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to validate if current directory is an iOS application project
  private async validateIOSProject(projectDir: string, fs: any): Promise<boolean> {
    try {
      console.log('[BitBar Validation] Checking iOS project indicators in:', projectDir);
      
      // Define iOS project indicators
      const iosProjectIndicators = [
        // Xcode project files
        '*.xcodeproj',
        '*.xcworkspace',
        
        // iOS specific files
        'Info.plist',
        'AppDelegate.swift',
        'AppDelegate.m',
        'AppDelegate.h',
        'SceneDelegate.swift',
        'SceneDelegate.m',
        'SceneDelegate.h',
        
        // iOS specific directories
        '*.app',
        '*.ipa',
        
        // Configuration files that often contain iOS-specific content
        'project.pbxproj'
      ];
      
      // Check for direct file matches
      for (const indicator of iosProjectIndicators) {
        if (indicator.includes('*')) {
          // Handle wildcard patterns
          const extension = indicator.replace('*', '');
          const items = fs.readdirSync(projectDir);
          
          for (const item of items) {
            if (item.endsWith(extension)) {
              console.log(`[BitBar Validation] Found iOS indicator: ${item}`);
              return true;
            }
          }
        } else {
          // Handle exact file names
          const filePath = `${projectDir}/${indicator}`;
          if (fs.existsSync(filePath)) {
            console.log(`[BitBar Validation] Found iOS indicator: ${indicator}`);
            return true;
          }
        }
      }
      
      // Check subdirectories for iOS indicators (one level deep)
      const items = fs.readdirSync(projectDir);
      for (const item of items) {
        const itemPath = `${projectDir}/${item}`;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Check for common iOS directory structures
          const commonIOSDirs = [
            'ios', 'iOS', 
            'app', 'App',
            'src', 'source',
            'Sources'
          ];
          
          if (commonIOSDirs.includes(item)) {
            // Recursively check these directories for iOS indicators
            try {
              const subItems = fs.readdirSync(itemPath);
              for (const subItem of subItems) {
                if (subItem.endsWith('.xcodeproj') || 
                    subItem.endsWith('.xcworkspace') || 
                    subItem === 'Info.plist' ||
                    subItem.includes('AppDelegate')) {
                  console.log(`[BitBar Validation] Found iOS indicator in ${item}/${subItem}`);
                  return true;
                }
              }
            } catch (error) {
              // Continue if we can't read subdirectory
              continue;
            }
          }
        }
      }
      
      // Additional check: Look for package.json with iOS-related dependencies
      const packageJsonPath = `${projectDir}/package.json`;
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          const iosRelatedPackages = [
            'react-native',
            '@react-native',
            'expo',
            'cordova-ios',
            'ionic',
            'capacitor'
          ];
          
          for (const pkg of iosRelatedPackages) {
            for (const dep in dependencies) {
              if (dep.includes(pkg)) {
                console.log(`[BitBar Validation] Found iOS-related dependency: ${dep}`);
                return true;
              }
            }
          }
        } catch (error) {
          // Continue if we can't parse package.json
        }
      }
      
      console.log('[BitBar Validation] No iOS project indicators found');
      return false;
      
    } catch (error) {
      console.error('[BitBar Validation] Error during iOS project validation:', error);
      // In case of validation errors, we'll be conservative and return false
      return false;
    }
  }

  // Helper method to extract iOS project name from project files
  private async extractIOSProjectName(projectDir: string, fs: any): Promise<string | null> {
    try {
      console.log('[BitBar ProjectName] Extracting iOS project name from:', projectDir);
      
      // Strategy 1: Look for .xcodeproj directories and extract project name
      const findXcodeprojDirs = (dir: string, maxDepth: number = 2): string[] => {
        if (maxDepth <= 0) return [];
        
        const xcodeprojPaths: string[] = [];
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const itemPath = `${dir}/${item}`;
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && item.endsWith('.xcodeproj')) {
              console.log(`[BitBar ProjectName] Found Xcode project: ${item}`);
              const projectName = item.replace('.xcodeproj', '');
              if (projectName && projectName.length > 0) {
                xcodeprojPaths.push(projectName);
              }
            } else if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
              // Recursively search subdirectories
              xcodeprojPaths.push(...findXcodeprojDirs(itemPath, maxDepth - 1));
            }
          }
        } catch (error) {
          // Continue if we can't read directory
        }
        
        return xcodeprojPaths;
      };
      
      const xcodeprojNames = findXcodeprojDirs(projectDir);
      if (xcodeprojNames.length > 0) {
        const projectName = xcodeprojNames[0]; // Use the first found project
        console.log(`[BitBar ProjectName] Using Xcode project name: ${projectName}`);
        return projectName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      }
      
      // Strategy 2: Look for .xcworkspace directories
      const findXcworkspaceDirs = (dir: string, maxDepth: number = 2): string[] => {
        if (maxDepth <= 0) return [];
        
        const xcworkspacePaths: string[] = [];
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const itemPath = `${dir}/${item}`;
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && item.endsWith('.xcworkspace')) {
              console.log(`[BitBar ProjectName] Found Xcode workspace: ${item}`);
              const workspaceName = item.replace('.xcworkspace', '');
              if (workspaceName && workspaceName.length > 0) {
                xcworkspacePaths.push(workspaceName);
              }
            } else if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
              // Recursively search subdirectories
              xcworkspacePaths.push(...findXcworkspaceDirs(itemPath, maxDepth - 1));
            }
          }
        } catch (error) {
          // Continue if we can't read directory
        }
        
        return xcworkspacePaths;
      };
      
      const xcworkspaceNames = findXcworkspaceDirs(projectDir);
      if (xcworkspaceNames.length > 0) {
        const workspaceName = xcworkspaceNames[0]; // Use the first found workspace
        console.log(`[BitBar ProjectName] Using Xcode workspace name: ${workspaceName}`);
        return workspaceName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      }
      
      // Strategy 3: Look for Info.plist and extract CFBundleName or CFBundleDisplayName
      const findInfoPlistFiles = (dir: string, maxDepth: number = 3): string[] => {
        if (maxDepth <= 0) return [];
        
        const infoPlistPaths: string[] = [];
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const itemPath = `${dir}/${item}`;
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile() && item === 'Info.plist') {
              infoPlistPaths.push(itemPath);
            } else if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
              infoPlistPaths.push(...findInfoPlistFiles(itemPath, maxDepth - 1));
            }
          }
        } catch (error) {
          // Continue if we can't read directory
        }
        
        return infoPlistPaths;
      };
      
      const infoPlistFiles = findInfoPlistFiles(projectDir);
      for (const plistPath of infoPlistFiles) {
        try {
          const plistContent = fs.readFileSync(plistPath, 'utf8');
          
          // Look for CFBundleDisplayName first (user-facing name)
          let bundleNameMatch = plistContent.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/);
          if (!bundleNameMatch) {
            // Fallback to CFBundleName
            bundleNameMatch = plistContent.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/);
          }
          
          if (bundleNameMatch && bundleNameMatch[1]) {
            const bundleName = bundleNameMatch[1].trim();
            // Skip template/placeholder names
            if (!bundleName.includes('$(') && bundleName.length > 0 && bundleName !== 'MyApp') {
              console.log(`[BitBar ProjectName] Found bundle name in Info.plist: ${bundleName}`);
              return bundleName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
            }
          }
        } catch (error) {
          console.log(`[BitBar ProjectName] Error reading ${plistPath}:`, error);
          continue;
        }
      }
      
      // Strategy 4: Look for package.json name field
      const packageJsonPath = `${projectDir}/package.json`;
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name && typeof packageJson.name === 'string') {
            const packageName = packageJson.name.replace(/^@[^\/]+\//, ''); // Remove scope if present
            console.log(`[BitBar ProjectName] Found project name in package.json: ${packageName}`);
            return packageName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
          }
        } catch (error) {
          console.log('[BitBar ProjectName] Error parsing package.json:', error);
        }
      }
      
      console.log('[BitBar ProjectName] No iOS project name found');
      return null;
      
    } catch (error) {
      console.error('[BitBar ProjectName] Error during project name extraction:', error);
      return null;
    }
  }

  // Helper method to extract bundle ID from iOS project
  private async extractBundleIdFromProject(projectDir: string, fs: any): Promise<string | null> {
    try {
      console.log('[BitBar BundleID] Extracting bundle ID from iOS project in:', projectDir);
      
      // Strategy 1: Look for Info.plist files and extract CFBundleIdentifier
      const findInfoPlistFiles = (dir: string, maxDepth: number = 3): string[] => {
        if (maxDepth <= 0) return [];
        
        const infoPlistPaths: string[] = [];
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const itemPath = `${dir}/${item}`;
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile() && item === 'Info.plist') {
              infoPlistPaths.push(itemPath);
            } else if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
              // Recursively search subdirectories
              infoPlistPaths.push(...findInfoPlistFiles(itemPath, maxDepth - 1));
            }
          }
        } catch (error) {
          // Continue if we can't read directory
        }
        
        return infoPlistPaths;
      };
      
      const infoPlistFiles = findInfoPlistFiles(projectDir);
      console.log(`[BitBar BundleID] Found ${infoPlistFiles.length} Info.plist files`);
      
      for (const plistPath of infoPlistFiles) {
        try {
          const plistContent = fs.readFileSync(plistPath, 'utf8');
          console.log(`[BitBar BundleID] Checking ${plistPath}`);
          
          // Look for CFBundleIdentifier in the plist (XML format)
          const bundleIdMatch = plistContent.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
          if (bundleIdMatch && bundleIdMatch[1]) {
            const bundleId = bundleIdMatch[1].trim();
            // Skip template/placeholder bundle IDs
            if (!bundleId.includes('$(') && bundleId.includes('.') && bundleId.length > 5) {
              console.log(`[BitBar BundleID] Found bundle ID in ${plistPath}: ${bundleId}`);
              return bundleId;
            }
          }
        } catch (error) {
          console.log(`[BitBar BundleID] Error reading ${plistPath}:`, error);
          continue;
        }
      }
      
      // Strategy 2: Look for project.pbxproj files and extract bundle identifier
      const findPbxprojFiles = (dir: string, maxDepth: number = 3): string[] => {
        if (maxDepth <= 0) return [];
        
        const pbxprojPaths: string[] = [];
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const itemPath = `${dir}/${item}`;
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile() && item === 'project.pbxproj') {
              pbxprojPaths.push(itemPath);
            } else if (stat.isDirectory() && item.endsWith('.xcodeproj')) {
              // Look inside .xcodeproj bundles
              pbxprojPaths.push(...findPbxprojFiles(itemPath, maxDepth - 1));
            } else if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
              // Recursively search other subdirectories
              pbxprojPaths.push(...findPbxprojFiles(itemPath, maxDepth - 1));
            }
          }
        } catch (error) {
          // Continue if we can't read directory
        }
        
        return pbxprojPaths;
      };
      
      const pbxprojFiles = findPbxprojFiles(projectDir);
      console.log(`[BitBar BundleID] Found ${pbxprojFiles.length} project.pbxproj files`);
      
      for (const pbxprojPath of pbxprojFiles) {
        try {
          const pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');
          console.log(`[BitBar BundleID] Checking ${pbxprojPath}`);
          
          // Look for PRODUCT_BUNDLE_IDENTIFIER in the pbxproj file
          const bundleIdMatches = pbxprojContent.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g);
          if (bundleIdMatches && bundleIdMatches.length > 0) {
            for (const match of bundleIdMatches) {
              const bundleIdMatch = match.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/);
              if (bundleIdMatch && bundleIdMatch[1]) {
                const bundleId = bundleIdMatch[1].trim().replace(/"/g, '');
                // Skip template/placeholder bundle IDs
                if (!bundleId.includes('$(') && bundleId.includes('.') && bundleId.length > 5) {
                  console.log(`[BitBar BundleID] Found bundle ID in ${pbxprojPath}: ${bundleId}`);
                  return bundleId;
                }
              }
            }
          }
        } catch (error) {
          console.log(`[BitBar BundleID] Error reading ${pbxprojPath}:`, error);
          continue;
        }
      }
      
      // Strategy 3: Look for package.json with React Native or similar configurations
      const packageJsonPath = `${projectDir}/package.json`;
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Check for React Native configuration
          if (packageJson.react && packageJson.react.ios && packageJson.react.ios.bundleIdentifier) {
            const bundleId = packageJson.react.ios.bundleIdentifier;
            console.log(`[BitBar BundleID] Found bundle ID in package.json (React Native): ${bundleId}`);
            return bundleId;
          }
          
          // Check for Expo configuration
          if (packageJson.expo && packageJson.expo.ios && packageJson.expo.ios.bundleIdentifier) {
            const bundleId = packageJson.expo.ios.bundleIdentifier;
            console.log(`[BitBar BundleID] Found bundle ID in package.json (Expo): ${bundleId}`);
            return bundleId;
          }
        } catch (error) {
          console.log('[BitBar BundleID] Error parsing package.json:', error);
        }
      }
      
      // Strategy 4: Look for app.json (Expo projects)
      const appJsonPath = `${projectDir}/app.json`;
      if (fs.existsSync(appJsonPath)) {
        try {
          const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
          if (appJson.expo && appJson.expo.ios && appJson.expo.ios.bundleIdentifier) {
            const bundleId = appJson.expo.ios.bundleIdentifier;
            console.log(`[BitBar BundleID] Found bundle ID in app.json: ${bundleId}`);
            return bundleId;
          }
        } catch (error) {
          console.log('[BitBar BundleID] Error parsing app.json:', error);
        }
      }
      
      console.log('[BitBar BundleID] No bundle ID found in project');
      return null;
      
    } catch (error) {
      console.error('[BitBar BundleID] Error during bundle ID extraction:', error);
      return null;
    }
  }

  registerTools(server: McpServer): void {
    // User/Account Tools
    server.tool(
      "bitbar_get_user",
      "Get current BitBar user information",
      {},
      async (_args, _extra) => {
        const response = await this.getUser();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // Project Management Tools
    server.tool(
      "bitbar_list_projects",
      "List all BitBar projects",
      {},
      async (_args, _extra) => {
        const response = await this.listProjects();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_get_project",
      "Get details of a specific BitBar project",
      {
        projectId: z.string().describe("ID of the project to retrieve"),
      },
      async (args, _extra) => {
        if (!args.projectId) throw new Error("projectId argument is required");
        const response = await this.getProject(args.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_create_project",
      "Create a new BitBar project",
      {
        name: z.string().optional().describe("Name of the project (auto-generated if not provided)"),
        description: z.string().optional().describe("Description of the project"),
        archivingStrategy: z.string().optional().describe("Archiving strategy for the project"),
        archivingItemCount: z.number().optional().describe("Number of items to keep when archiving"),
      },
      async (args, _extra) => {
        const response = await this.createProject(args);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_update_project",
      "Update an existing BitBar project",
      {
        projectId: z.string().describe("ID of the project to update"),
        name: z.string().optional().describe("New name for the project"),
        description: z.string().optional().describe("New description for the project"),
        archivingStrategy: z.string().optional().describe("New archiving strategy"),
        archivingItemCount: z.number().optional().describe("New archiving item count"),
      },
      async (args, _extra) => {
        if (!args.projectId) throw new Error("projectId argument is required");
        const { projectId, ...updateArgs } = args;
        const response = await this.updateProject(projectId, updateArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // Device Management Tools
    server.tool(
      "bitbar_list_devices",
      "List all available BitBar devices supporting pagination",
      {},
      async (_args, _extra) => {
        const response = await this.listDevices();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_list_device_groups",
      "List all BitBar device groups",
      {},
      async (_args, _extra) => {
        const response = await this.listDeviceGroups();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_get_device_group",
      "Get details of a specific device group",
      {
        deviceGroupId: z.string().describe("ID of the device group to retrieve"),
      },
      async (args, _extra) => {
        if (!args.deviceGroupId) throw new Error("deviceGroupId argument is required");
        const response = await this.getDeviceGroup(args.deviceGroupId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // File Management Tools
    server.tool(
      "bitbar_list_files",
      "List all BitBar files",
      {},
      async (_args, _extra) => {
        const response = await this.listFiles();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_get_file",
      "Get details of a specific file",
      {
        fileId: z.string().describe("ID of the file to retrieve"),
      },
      async (args, _extra) => {
        if (!args.fileId) throw new Error("fileId argument is required");
        const response = await this.getFile(args.fileId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_upload_file",
      "Upload a new file to BitBar",
      {
        filePath: z.string().describe("Path to the file to upload"),
        filename: z.string().optional().describe("Custom filename (optional, will use file basename if not provided)"),
        contentType: z.string().optional().describe("MIME type of the file (optional, will be auto-detected)"),
      },
      async (args, _extra) => {
        try {
          console.log('[BitBar MCP] Upload tool called with file path:', args.filePath);
          
          if (!args.filePath) {
            throw new Error("filePath argument is required");
          }
          
          // Additional validation
          if (typeof args.filePath !== 'string' || args.filePath.trim() === '') {
            throw new Error("filePath must be a non-empty string");
          }
          
          // Import fs module
          const fs = await import('fs');
          const path = await import('path');
          
          // Check if file exists
          if (!fs.existsSync(args.filePath)) {
            throw new Error(`File not found: ${args.filePath}`);
          }
          
          // Get file stats
          const stats = fs.statSync(args.filePath);
          if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${args.filePath}`);
          }
          
          // Check file size (50MB limit)
          const maxFileSize = 50 * 1024 * 1024; // 50MB
          if (stats.size > maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes (max: ${maxFileSize} bytes)`);
          }
          
          console.log('[BitBar MCP] File size:', stats.size, 'bytes');
          
          // Determine filename
          const filename = args.filename || path.basename(args.filePath);
          console.log('[BitBar MCP] Using filename:', filename);
          
          // Read file and convert to base64
          const fileBuffer = fs.readFileSync(args.filePath);
          const base64Content = fileBuffer.toString('base64');
          console.log('[BitBar MCP] File converted to base64, length:', base64Content.length);
          
          // Auto-detect content type if not provided
          let contentType = args.contentType;
          if (!contentType) {
            const ext = path.extname(args.filePath).toLowerCase();
            const mimeTypes: { [key: string]: string } = {
              '.txt': 'text/plain',
              '.json': 'application/json',
              '.js': 'application/javascript',
              '.html': 'text/html',
              '.css': 'text/css',
              '.xml': 'application/xml',
              '.zip': 'application/zip',
              '.apk': 'application/vnd.android.package-archive',
              '.ipa': 'application/octet-stream',
              '.jar': 'application/java-archive',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.pdf': 'application/pdf'
            };
            contentType = mimeTypes[ext] || 'application/octet-stream';
          }
          console.log('[BitBar MCP] Using content type:', contentType);
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('BitBar upload timed out after 30 seconds')), 30000);
          });
          
          console.log('[BitBar MCP] Starting upload...');
          const uploadPromise = this.uploadFile({
            filename,
            fileContent: base64Content,
            contentType
          });
          const response = await Promise.race([uploadPromise, timeoutPromise]);
          
          console.log('[BitBar MCP] Upload completed successfully');
          return {
            content: [{ type: "text", text: JSON.stringify({
              ...response,
              originalPath: args.filePath,
              uploadedSize: stats.size
            }, null, 2) }],
          };
        } catch (error) {
          console.error('[BitBar MCP] Upload error:', error);
          // Ensure we always return a response, even on error
          const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({ 
                error: true, 
                message: errorMessage,
                timestamp: new Date().toISOString(),
                filePath: args.filePath
              }, null, 2) 
            }],
          };
        }
      }
    );

    server.tool(
      "bitbar_download_file",
      "Download a file from BitBar",
      {
        fileId: z.string().describe("ID of the file to download"),
      },
      async (args, _extra) => {
        if (!args.fileId) throw new Error("fileId argument is required");
        const blob = await this.downloadFile(args.fileId);
        const arrayBuffer = await blob.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString('base64');
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              contentType: blob.type,
              size: blob.size,
              content: base64Content
            }, null, 2) 
          }],
        };
      }
    );

    server.tool(
      "bitbar_update_file_name",
      "Update the name of an existing file",
      {
        fileId: z.string().describe("ID of the file to update"),
        filename: z.string().describe("New name for the file"),
      },
      async (args, _extra) => {
        if (!args.fileId || !args.filename) {
          throw new Error("fileId and filename arguments are required");
        }
        const response = await this.updateFileName(args.fileId, args.filename);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_update_file_content",
      "Update the content of an existing file",
      {
        fileId: z.string().describe("ID of the file to update"),
        filename: z.string().describe("Name of the file"),
        fileContent: z.string().describe("Base64 encoded new file content"),
        contentType: z.string().optional().describe("MIME type of the file"),
      },
      async (args, _extra) => {
        if (!args.fileId || !args.filename || !args.fileContent) {
          throw new Error("fileId, filename, and fileContent arguments are required");
        }
        const { fileId, ...uploadArgs } = args;
        const response = await this.updateFileContent(fileId, uploadArgs as UploadFileArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // Framework and Test Tools
    server.tool(
      "bitbar_list_frameworks",
      "List all available testing frameworks",
      {},
      async (_args, _extra) => {
        const response = await this.listFrameworks();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_create_test_run",
      "Create and start a new test run",
      {
        osType: z.enum(["ANDROID", "IOS", "DESKTOP"]).describe("Operating system type"),
        projectId: z.string().describe("ID of the project for the test run"),
        files: z.array(z.object({
          id: z.string(),
          action: z.enum(["COPY_TO_DEVICE", "INSTALL", "RUN_TEST"]).optional(),
        })).describe("Array of file configurations"),
        frameworkId: z.string().describe("ID of the testing framework"),
        deviceGroupId: z.string().optional().describe("ID of the device group"),
        deviceIds: z.array(z.string()).optional().describe("Array of specific device IDs"),
        testRunName: z.string().optional().describe("Name for the test run"),
        scheduler: z.enum(["PARALLEL", "SERIAL", "SINGLE", "ALL_INSTANCES"]).optional().describe("Test execution scheduler"),
        timeout: z.number().optional().describe("Timeout for the test run"),
        videoRecordingEnabled: z.boolean().optional().describe("Enable video recording"),
        screenshotDir: z.string().optional().describe("Directory for screenshots"),
        maxAutoRetriesCount: z.number().optional().describe("Maximum auto retry count"),
        hookURL: z.string().optional().describe("Webhook URL for notifications"),
      },
      async (args, _extra) => {
        const requiredFields: (keyof CreateTestRunArgs)[] = ["osType", "projectId", "files", "frameworkId"];
        for (const field of requiredFields) {
          if (!args[field]) throw new Error(`${field} argument is required`);
        }
        if (!args.deviceGroupId && !args.deviceIds) {
          throw new Error("Either deviceGroupId or deviceIds must be provided");
        }
        const response = await this.createTestRun(args as CreateTestRunArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_list_test_runs",
      "List test runs for a project or user",
      {
        projectId: z.string().optional().describe("ID of the project (if not provided, lists all user's test runs)"),
      },
      async (args, _extra) => {
        const response = await this.listTestRuns(args.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_get_test_run",
      "Get details of a specific test run",
      {
        runId: z.string().describe("ID of the test run to retrieve"),
      },
      async (args, _extra) => {
        if (!args.runId) throw new Error("runId argument is required");
        const response = await this.getTestRun(args.runId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_abort_test_run",
      "Abort a running test",
      {
        runId: z.string().describe("ID of the test run to abort"),
      },
      async (args, _extra) => {
        if (!args.runId) throw new Error("runId argument is required");
        const response = await this.abortTestRun(args.runId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // Device Session Tools
    server.tool(
      "bitbar_list_device_sessions",
      "List device sessions for a test run",
      {
        runId: z.string().describe("ID of the test run"),
      },
      async (args, _extra) => {
        if (!args.runId) throw new Error("runId argument is required");
        const response = await this.listDeviceSessions(args.runId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    server.tool(
      "bitbar_get_device_session",
      "Get details of a specific device session",
      {
        sessionId: z.string().describe("ID of the device session"),
      },
      async (args, _extra) => {
        if (!args.sessionId) throw new Error("sessionId argument is required");
        const response = await this.getDeviceSession(args.sessionId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
    );

    // BitBar Test Package Creation Tool
    server.tool(
      "bitbar_create_ios_test_pkg",
      "Create a complete iOS test package for BitBar with consistent naming format: {iOS-Project-Name}_test_pkg_{2025m01d15h14m30}. This tool validates that it's running in an iOS application project directory and automatically extracts both the iOS project name and bundle ID from the project configuration. The zip filename uses auto-detected project name with timestamp format {YYYY}m{MM}d{DD}h{HH}m{mm}. Accepts JSON format from error-repro-details prompt with device requirements and reproduction steps that are automatically converted to Appium code.",
      {
        bundleId: z.string().optional().describe("iOS app bundle ID override (optional, will auto-detect from project if not provided)"),
        testSteps: z.string().optional().describe("Human-written test steps as a numbered list (legacy format) OR JSON string from error-repro-details prompt with device_requirements and reproduction_steps arrays"),
        reproductionData: z.object({
          device_requirements: z.object({
            device_model: z.string().optional(),
            operating_system: z.string().optional()
          }).optional(),
          reproduction_steps: z.array(z.object({
            timestamp: z.string().optional(),
            action: z.string(),
            appium_selector: z.string()
          })).optional()
        }).optional().describe("Structured JSON data from error-repro-details prompt containing device requirements and reproduction steps"),
        projectName: z.string().optional().describe("Project name for the package filename (optional, will detect from current directory)"),
      },
      async (args, _extra) => {
        let bundleId: string | undefined;
        
        try {
          console.log('[BitBar Package] Creating iOS test package...');
          
          // Import required modules
          const fs = await import('fs');
          const path = await import('path');
          const archiver = await import('archiver');
          
          // Validate that this is an iOS application project
          console.log('[BitBar Package] Validating iOS project structure...');
          const currentDir = process.cwd();
          const isIOSProject = await this.validateIOSProject(currentDir, fs);
          
          if (!isIOSProject) {
            throw new Error(
              'This tool can only be used in iOS application projects. ' +
              'Please ensure you are in a directory containing iOS project files ' +
              '(such as *.xcodeproj, *.xcworkspace, Info.plist, or other iOS-specific files).'
            );
          }
          
          console.log('[BitBar Package] iOS project structure validated successfully');
          
          // Auto-detect bundle ID from project or use provided override
          bundleId = args.bundleId;
          if (!bundleId) {
            console.log('[BitBar Package] Auto-detecting bundle ID from project...');
            const detectedBundleId = await this.extractBundleIdFromProject(currentDir, fs);
            
            if (!detectedBundleId) {
              throw new Error(
                'Could not automatically detect bundle ID from iOS project. ' +
                'Please ensure your project contains Info.plist with CFBundleIdentifier, ' +
                'project.pbxproj with PRODUCT_BUNDLE_IDENTIFIER, or provide bundleId parameter manually.'
              );
            }
            
            bundleId = detectedBundleId;
            console.log(`[BitBar Package] Auto-detected bundle ID: ${bundleId}`);
          } else {
            console.log(`[BitBar Package] Using provided bundle ID: ${bundleId}`);
          }
          
          // Auto-detect iOS project name with enhanced detection
          let iOSProjectName = args.projectName;
          if (!iOSProjectName) {
            console.log('[BitBar Package] Auto-detecting iOS project name...');
            const extractedProjectName = await this.extractIOSProjectName(currentDir, fs);
            
            if (extractedProjectName) {
              iOSProjectName = extractedProjectName;
            } else {
              // Fallback to current directory name with sanitization
              const baseName = path.basename(process.cwd());
              iOSProjectName = baseName
                .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid chars with underscore
                .replace(/_{2,}/g, '_') // Replace multiple underscores with single
                .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
                .toLowerCase(); // Convert to lowercase for consistency
              
              // If sanitization resulted in empty string, use default
              if (!iOSProjectName || iOSProjectName.length === 0) {
                iOSProjectName = 'ios_project';
              }
            }
          }
          console.log('[BitBar Package] iOS project name:', iOSProjectName);
          
          // Create timestamp with specific format: {YYYY}m{MM}d{DD}h{HH}m{mm}
          const now = new Date();
          const year = now.getFullYear().toString(); // YYYY
          const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM (01-12)
          const day = now.getDate().toString().padStart(2, '0'); // DD (01-31)
          const hour = now.getHours().toString().padStart(2, '0'); // HH (00-23)
          const minute = now.getMinutes().toString().padStart(2, '0'); // mm (00-59)
          const formattedTimestamp = `${year}m${month}d${day}h${hour}m${minute}`;
          
          console.log('[BitBar Package] Generated timestamp:', formattedTimestamp);
          
          // Create BitBarPackages directory if it doesn't exist
          const packagesDir = path.join(process.cwd(), 'BitBarPackages');
          if (!fs.existsSync(packagesDir)) {
            console.log('[BitBar Package] Creating BitBarPackages directory');
            fs.mkdirSync(packagesDir, { recursive: true });
          }
          
          // Generate zip filename with consistent naming structure: {iOS-Project-Name}_test_pkg_{y2025m01d15h14m30}
          const zipFilename = `${iOSProjectName}_test_pkg_${formattedTimestamp}.zip`;
          const zipPath = path.join(packagesDir, zipFilename);
          console.log('[BitBar Package] Creating zip file:', zipPath);
          
          // Get resource contents using the helper method
          console.log('[BitBar Package] Generating file contents using resources...');
          
          // Get requirements.txt content
          const requirementsUri = new URL('bitbar://templates/requirements.txt');
          const requirementsResource = await this.generateResourceContent('ios_test_requirements', requirementsUri);
          
          // Get run-tests.sh content
          const runTestsUri = new URL('bitbar://templates/run-tests.sh');
          const runTestsResource = await this.generateResourceContent('ios_test_run_tests_sh', runTestsUri);
          
          // Get BitBarAppTest.py content with optional test steps or reproduction data
          const appTestUri = new URL('bitbar://templates/BitBarAppTest.py');
          if (args.testSteps) {
            appTestUri.searchParams.set('test_steps', args.testSteps);
          }
          if (args.reproductionData) {
            appTestUri.searchParams.set('reproduction_data', JSON.stringify(args.reproductionData));
          }
          const appTestResource = await this.generateResourceContent('ios_test_app_script', appTestUri);
          
          // Get BitBarAppiumTest.py content with bundle ID
          const appiumTestUri = new URL('bitbar://templates/BitBarAppiumTest.py');
          appiumTestUri.searchParams.set('bundle_id', bundleId);
          const appiumTestResource = await this.generateResourceContent('ios_test_appium_script', appiumTestUri);
          
          console.log('[BitBar Package] All resource contents generated successfully');
          
          // Create zip file
          return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver.default('zip', {
              zlib: { level: 9 } // Maximum compression
            });
            
            output.on('close', () => {
              const fileSize = archive.pointer();
              console.log('[BitBar Package] Zip file created successfully');
              console.log('[BitBar Package] Total bytes:', fileSize);
              
              resolve({
                content: [{ 
                  type: "text", 
                  text: JSON.stringify({
                    success: true,
                    packagePath: zipPath,
                    packageName: zipFilename,
                    bundleId: bundleId,
                    projectName: iOSProjectName,
                    timestamp: formattedTimestamp,
                    fileSize: fileSize,
                    files: [
                      'run-tests.sh',
                      'requirements.txt', 
                      'BitBarAppTest.py',
                      'BitBarAppiumTest.py'
                    ],
                    message: `iOS test package created successfully at ${zipPath}`,
                    bundleIdSource: args.bundleId ? 'user-provided' : 'auto-detected'
                  }, null, 2)
                }],
              });
            });
            
            output.on('error', (err: Error) => {
              console.error('[BitBar Package] Output stream error:', err);
              reject(new Error(`Failed to create zip file: ${err.message}`));
            });
            
            archive.on('error', (err: Error) => {
              console.error('[BitBar Package] Archive error:', err);
              reject(new Error(`Failed to create archive: ${err.message}`));
            });
            
            archive.pipe(output);
            
            // Add files to the archive
            try {
              console.log('[BitBar Package] Adding files to archive...');
              
              archive.append(runTestsResource, { name: 'run-tests.sh' });
              archive.append(requirementsResource, { name: 'requirements.txt' });
              archive.append(appTestResource, { name: 'BitBarAppTest.py' });
              archive.append(appiumTestResource, { name: 'BitBarAppiumTest.py' });
              
              console.log('[BitBar Package] All files added, finalizing archive...');
              archive.finalize();
              
            } catch (archiveError) {
              console.error('[BitBar Package] Error adding files to archive:', archiveError);
              reject(new Error(`Failed to add files to archive: ${archiveError instanceof Error ? archiveError.message : 'Unknown error'}`));
            }
          });
          
        } catch (error) {
          console.error('[BitBar Package] Package creation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown package creation error';
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({ 
                error: true, 
                message: errorMessage,
                bundleId: bundleId || 'not-detected',
                timestamp: new Date().toISOString()
              }, null, 2) 
            }],
          };
        }
      }
    );

    // BitBar IPA Build Tool
    server.tool(
      "bitbar_build_ipa",
      "Build an iOS IPA file for BitBar testing using Xcode build and export commands. This tool validates that it's running in an iOS application project directory, automatically detects the project name, creates an archive, and exports it as an IPA file with consistent naming format: {iOS-Project-Name}_{YYYY}m{MM}d{DD}h{HH}m{mm}.ipa. Requires Xcode and valid iOS project configuration.",
      {
        scheme: z.string().optional().describe("Xcode scheme name to build (optional, will auto-detect if not provided)"),
        configuration: z.string().optional().describe("Build configuration (Debug/Release, defaults to Release)"),
        archivePath: z.string().optional().describe("Custom archive path (optional, defaults to ./build/{ProjectName}.xcarchive)"),
        exportPath: z.string().optional().describe("Custom export directory path (optional, defaults to ./build/Export/)"),
        exportOptionsPlist: z.string().optional().describe("Custom ExportOptions.plist path (optional, will create default if not provided)"),
        projectName: z.string().optional().describe("Project name for the IPA filename (optional, will detect from current directory)"),
      },
      async (args, _extra) => {
        try {
          console.log('[BitBar IPA] Starting iOS IPA build process...');
          
          // Import required modules
          const fs = await import('fs');
          const path = await import('path');
          const { spawn } = await import('child_process');
          
          // Validate that this is an iOS application project
          console.log('[BitBar IPA] Validating iOS project structure...');
          const currentDir = process.cwd();
          const isIOSProject = await this.validateIOSProject(currentDir, fs);
          
          if (!isIOSProject) {
            throw new Error(
              'This tool can only be used in iOS application projects. ' +
              'Please ensure you are in a directory containing iOS project files ' +
              '(such as *.xcodeproj, *.xcworkspace, Info.plist, or other iOS-specific files).'
            );
          }
          
          console.log('[BitBar IPA] iOS project structure validated successfully');
          
          // Auto-detect iOS project name
          let iOSProjectName = args.projectName;
          if (!iOSProjectName) {
            console.log('[BitBar IPA] Auto-detecting iOS project name...');
            const extractedProjectName = await this.extractIOSProjectName(currentDir, fs);
            
            if (extractedProjectName) {
              iOSProjectName = extractedProjectName;
            } else {
              // Fallback to current directory name with sanitization
              const baseName = path.basename(process.cwd());
              iOSProjectName = baseName
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '')
                .toLowerCase();
              
              if (!iOSProjectName || iOSProjectName.length === 0) {
                iOSProjectName = 'ios_project';
              }
            }
          }
          console.log('[BitBar IPA] iOS project name:', iOSProjectName);
          
          // Create timestamp with specific format: {YYYY}m{MM}d{DD}h{HH}m{mm}
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const hour = now.getHours().toString().padStart(2, '0');
          const minute = now.getMinutes().toString().padStart(2, '0');
          const formattedTimestamp = `${year}m${month}d${day}h${hour}m${minute}`;
          
          console.log('[BitBar IPA] Generated timestamp:', formattedTimestamp);
          
          // Set up build paths
          const buildDir = path.join(currentDir, 'build');
          const archivePath = args.archivePath || path.join(buildDir, `${iOSProjectName}.xcarchive`);
          const exportPath = args.exportPath || path.join(buildDir, 'Export');
          const exportOptionsPlist = args.exportOptionsPlist || path.join(currentDir, 'ExportOptions.plist');
          
          // Create build directory if it doesn't exist
          if (!fs.existsSync(buildDir)) {
            console.log('[BitBar IPA] Creating build directory:', buildDir);
            fs.mkdirSync(buildDir, { recursive: true });
          }
          
          // Create default ExportOptions.plist if it doesn't exist
          if (!fs.existsSync(exportOptionsPlist)) {
            console.log('[BitBar IPA] Creating default ExportOptions.plist');
            const defaultExportOptions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>DEVELOPMENT_TEAM</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>`;
            fs.writeFileSync(exportOptionsPlist, defaultExportOptions);
          }
          
          // Find Xcode project or workspace
          const items = fs.readdirSync(currentDir);
          let projectFile = null;
          let isWorkspace = false;
          
          for (const item of items) {
            if (item.endsWith('.xcworkspace')) {
              projectFile = item;
              isWorkspace = true;
              break;
            } else if (item.endsWith('.xcodeproj')) {
              projectFile = item;
              isWorkspace = false;
            }
          }
          
          if (!projectFile) {
            throw new Error('No Xcode project (.xcodeproj) or workspace (.xcworkspace) found in current directory');
          }
          
          console.log(`[BitBar IPA] Using ${isWorkspace ? 'workspace' : 'project'}: ${projectFile}`);
          
          // Auto-detect scheme if not provided
          let scheme = args.scheme;
          if (!scheme) {
            // Use project name as scheme (common convention)
            scheme = projectFile.replace('.xcodeproj', '').replace('.xcworkspace', '');
            console.log(`[BitBar IPA] Auto-detected scheme: ${scheme}`);
          }
          
          const configuration = args.configuration || 'Release';
          console.log(`[BitBar IPA] Using configuration: ${configuration}`);
          
          // Build archive command
          const archiveArgs = [
            '-scheme', scheme,
            '-configuration', configuration,
            '-destination', 'generic/platform=iOS',
            '-archivePath', archivePath,
            'archive',
            'CODE_SIGN_STYLE=Automatic'
          ];
          
          if (isWorkspace) {
            archiveArgs.unshift('-workspace', projectFile);
          } else {
            archiveArgs.unshift('-project', projectFile);
          }
          
          console.log('[BitBar IPA] Creating archive...');
          console.log(`[BitBar IPA] Command: xcodebuild ${archiveArgs.join(' ')}`);
          
          // Execute archive command
          await new Promise<void>((resolve, reject) => {
            const archiveProcess = spawn('xcodebuild', archiveArgs, {
              cwd: currentDir,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            archiveProcess.stdout?.on('data', (data) => {
              stdout += data.toString();
            });
            
            archiveProcess.stderr?.on('data', (data) => {
              stderr += data.toString();
            });
            
            archiveProcess.on('close', (code) => {
              if (code === 0) {
                console.log('[BitBar IPA] Archive created successfully');
                resolve();
              } else {
                console.error('[BitBar IPA] Archive failed with code:', code);
                console.error('[BitBar IPA] Error output:', stderr);
                reject(new Error(`Archive build failed with exit code ${code}: ${stderr}`));
              }
            });
            
            archiveProcess.on('error', (error) => {
              reject(new Error(`Failed to start xcodebuild: ${error.message}`));
            });
          });
          
          // Export IPA command
          const exportArgs = [
            '-exportArchive',
            '-archivePath', archivePath,
            '-exportPath', exportPath,
            '-exportOptionsPlist', exportOptionsPlist
          ];
          
          console.log('[BitBar IPA] Exporting IPA...');
          console.log(`[BitBar IPA] Command: xcodebuild ${exportArgs.join(' ')}`);
          
          // Execute export command
          await new Promise<void>((resolve, reject) => {
            const exportProcess = spawn('xcodebuild', exportArgs, {
              cwd: currentDir,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            exportProcess.stdout?.on('data', (data) => {
              stdout += data.toString();
            });
            
            exportProcess.stderr?.on('data', (data) => {
              stderr += data.toString();
            });
            
            exportProcess.on('close', (code) => {
              if (code === 0) {
                console.log('[BitBar IPA] IPA exported successfully');
                resolve();
              } else {
                console.error('[BitBar IPA] Export failed with code:', code);
                console.error('[BitBar IPA] Error output:', stderr);
                reject(new Error(`IPA export failed with exit code ${code}: ${stderr}`));
              }
            });
            
            exportProcess.on('error', (error) => {
              reject(new Error(`Failed to start xcodebuild for export: ${error.message}`));
            });
          });
          
          // Find the exported IPA file and rename it with timestamp
          const exportedFiles = fs.readdirSync(exportPath);
          const ipaFile = exportedFiles.find(file => file.endsWith('.ipa'));
          
          if (!ipaFile) {
            throw new Error('No IPA file found in export directory');
          }
          
          const originalIpaPath = path.join(exportPath, ipaFile);
          const timestampedIpaName = `${iOSProjectName}_${formattedTimestamp}.ipa`;
          const finalIpaPath = path.join(exportPath, timestampedIpaName);
          
          // Rename the IPA file with timestamp
          fs.renameSync(originalIpaPath, finalIpaPath);
          console.log(`[BitBar IPA] Renamed IPA to: ${timestampedIpaName}`);
          
          // Get file size
          const stats = fs.statSync(finalIpaPath);
          const fileSize = stats.size;
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                success: true,
                ipaPath: finalIpaPath,
                ipaName: timestampedIpaName,
                projectName: iOSProjectName,
                timestamp: formattedTimestamp,
                fileSize: fileSize,
                scheme: scheme,
                configuration: configuration,
                archivePath: archivePath,
                exportPath: exportPath,
                message: `iOS IPA built successfully at ${finalIpaPath}`,
                originalName: ipaFile
              }, null, 2)
            }],
          };
          
        } catch (error) {
          console.error('[BitBar IPA] Build error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown build error';
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({ 
                error: true, 
                message: errorMessage,
                timestamp: new Date().toISOString(),
                suggestions: [
                  'Ensure Xcode is installed and configured properly',
                  'Verify that the iOS project builds successfully in Xcode',
                  'Check that signing certificates are properly configured',
                  'Ensure the scheme exists and is marked as shared',
                  'Verify ExportOptions.plist contains valid configuration'
                ]
              }, null, 2) 
            }],
          };
        }
      }
    );

    // BitBar Complete iOS Test Flow Tool
    server.tool(
      "bitbar_replay_session",
      "Complete iOS test workflow that orchestrates the entire testing process: 1) Generate test package from reproduction steps, 2) Build IPA file, 3) Upload both files to BitBar, 4) Start test run on specified device. This tool chains together bitbar_create_ios_test_pkg, bitbar_build_ipa, bitbar_upload_file, and bitbar_create_test_run to provide end-to-end iOS testing automation.",
      {
        reproductionSteps: z.object({
          device_requirements: z.object({
            device_model: z.string().optional(),
            operating_system: z.string().optional()
          }).optional(),
          reproduction_steps: z.array(z.object({
            timestamp: z.string().optional(),
            action: z.string(),
            appium_selector: z.string()
          })).optional()
        }).describe("JSON format reproduction steps from error-repro-details prompt containing device requirements and reproduction steps"),
        projectId: z.string().describe("BitBar project ID where the test run will be created"),
        testRunName: z.string().optional().describe("Custom name for the test run (optional, will auto-generate if not provided)"),
        bundleId: z.string().optional().describe("iOS app bundle ID override (optional, will auto-detect from project if not provided)"),
      },
      async (args, _extra) => {
        let testPackageResult: any = null;
        let ipaResult: any = null;
        let testPackageFileId: string | null = null;
        let ipaFileId: string | null = null;
        
        try {
          console.log('[BitBar ReplaySession] Starting complete iOS test workflow...');
          
          // Step 1: Generate test package using bitbar_create_ios_test_pkg
          console.log('[BitBar ReplaySession] Step 1: Creating iOS test package...');
          
          const testPackageTool = this.registerTools.bind(this);
          // We need to call the bitbar_create_ios_test_pkg functionality directly
          
          // Import required modules for package creation
          const fs = await import('fs');
          const path = await import('path');
          const archiver = await import('archiver');
          
          // Validate iOS project
          const currentDir = process.cwd();
          const isIOSProject = await this.validateIOSProject(currentDir, fs);
          
          if (!isIOSProject) {
            throw new Error(
              'This tool can only be used in iOS application projects. ' +
              'Please ensure you are in a directory containing iOS project files.'
            );
          }
          
          // Auto-detect bundle ID
          let bundleId = args.bundleId;
          if (!bundleId) {
            const detectedBundleId = await this.extractBundleIdFromProject(currentDir, fs);
            if (!detectedBundleId) {
              throw new Error(
                'Could not automatically detect bundle ID from iOS project. ' +
                'Please provide bundleId parameter manually.'
              );
            }
            bundleId = detectedBundleId;
          }
          
          // Auto-detect project name
          let iOSProjectName = await this.extractIOSProjectName(currentDir, fs);
          if (!iOSProjectName) {
            const baseName = path.basename(process.cwd());
            iOSProjectName = baseName
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .replace(/_{2,}/g, '_')
              .replace(/^_+|_+$/g, '')
              .toLowerCase() || 'ios_project';
          }
          
          // Create timestamp
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const hour = now.getHours().toString().padStart(2, '0');
          const minute = now.getMinutes().toString().padStart(2, '0');
          const formattedTimestamp = `${year}m${month}d${day}h${hour}m${minute}`;
          
          // Create package directory
          const packagesDir = path.join(process.cwd(), 'BitBarPackages');
          if (!fs.existsSync(packagesDir)) {
            fs.mkdirSync(packagesDir, { recursive: true });
          }
          
          // Generate zip filename
          const zipFilename = `${iOSProjectName}_test_pkg_${formattedTimestamp}.zip`;
          const zipPath = path.join(packagesDir, zipFilename);
          
          // Generate resource contents with reproduction steps
          const requirementsUri = new URL('bitbar://templates/requirements.txt');
          const requirementsResource = await this.generateResourceContent('ios_test_requirements', requirementsUri);
          
          const runTestsUri = new URL('bitbar://templates/run-tests.sh');
          const runTestsResource = await this.generateResourceContent('ios_test_run_tests_sh', runTestsUri);
          
          const appTestUri = new URL('bitbar://templates/BitBarAppTest.py');
          if (args.reproductionSteps) {
            appTestUri.searchParams.set('reproduction_data', JSON.stringify(args.reproductionSteps));
          }
          const appTestResource = await this.generateResourceContent('ios_test_app_script', appTestUri);
          
          const appiumTestUri = new URL('bitbar://templates/BitBarAppiumTest.py');
          appiumTestUri.searchParams.set('bundle_id', bundleId);
          const appiumTestResource = await this.generateResourceContent('ios_test_appium_script', appiumTestUri);
          
          // Create zip file
          await new Promise<void>((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver.default('zip', { zlib: { level: 9 } });
            
            output.on('close', () => resolve());
            output.on('error', reject);
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.append(runTestsResource, { name: 'run-tests.sh' });
            archive.append(requirementsResource, { name: 'requirements.txt' });
            archive.append(appTestResource, { name: 'BitBarAppTest.py' });
            archive.append(appiumTestResource, { name: 'BitBarAppiumTest.py' });
            archive.finalize();
          });
          
          testPackageResult = {
            success: true,
            packagePath: zipPath,
            packageName: zipFilename,
            bundleId: bundleId,
            projectName: iOSProjectName,
            timestamp: formattedTimestamp
          };
          
          console.log('[BitBar ReplaySession] Step 1 completed: Test package created');
          
          // Step 2: Build IPA file using bitbar_build_ipa logic
          console.log('[BitBar ReplaySession] Step 2: Building IPA file...');
          
          const { spawn } = await import('child_process');
          
          // Set up build paths
          const buildDir = path.join(currentDir, 'build');
          const archivePath = path.join(buildDir, `${iOSProjectName}.xcarchive`);
          const exportPath = path.join(buildDir, 'Export');
          const exportOptionsPlist = path.join(currentDir, 'ExportOptions.plist');
          
          console.log('[BitBar ReplaySession] IPA Build configuration:');
          console.log('[BitBar ReplaySession] - Build directory:', buildDir);
          console.log('[BitBar ReplaySession] - Archive path:', archivePath);
          console.log('[BitBar ReplaySession] - Export path:', exportPath);
          console.log('[BitBar ReplaySession] - ExportOptions.plist:', exportOptionsPlist);
          
          // Create build directory
          if (!fs.existsSync(buildDir)) {
            console.log('[BitBar ReplaySession] Creating build directory...');
            fs.mkdirSync(buildDir, { recursive: true });
            console.log('[BitBar ReplaySession] Build directory created successfully');
          } else {
            console.log('[BitBar ReplaySession] Build directory already exists');
          }
          
          // Create default ExportOptions.plist if needed
          if (!fs.existsSync(exportOptionsPlist)) {
            console.log('[BitBar ReplaySession] Creating default ExportOptions.plist...');
            const defaultExportOptions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>DEVELOPMENT_TEAM</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>`;
            fs.writeFileSync(exportOptionsPlist, defaultExportOptions);
            console.log('[BitBar ReplaySession] ExportOptions.plist created successfully');
          } else {
            console.log('[BitBar ReplaySession] Using existing ExportOptions.plist');
          }
          
          // Find Xcode project or workspace
          console.log('[BitBar ReplaySession] Searching for Xcode project files...');
          const items = fs.readdirSync(currentDir);
          console.log('[BitBar ReplaySession] Found items in directory:', items.slice(0, 10)); // Show first 10 items to avoid spam
          
          let projectFile = null;
          let isWorkspace = false;
          
          for (const item of items) {
            if (item.endsWith('.xcworkspace')) {
              projectFile = item;
              isWorkspace = true;
              console.log('[BitBar ReplaySession] Found Xcode workspace:', item);
              break;
            } else if (item.endsWith('.xcodeproj')) {
              projectFile = item;
              isWorkspace = false;
              console.log('[BitBar ReplaySession] Found Xcode project:', item);
            }
          }
          
          if (!projectFile) {
            console.error('[BitBar ReplaySession] ERROR: No Xcode project (.xcodeproj) or workspace (.xcworkspace) found');
            throw new Error('No Xcode project (.xcodeproj) or workspace (.xcworkspace) found');
          }
          
          console.log(`[BitBar ReplaySession] Will use ${isWorkspace ? 'workspace' : 'project'}: ${projectFile}`);
          
          // Auto-detect scheme
          const scheme = projectFile.replace('.xcodeproj', '').replace('.xcworkspace', '');
          console.log(`[BitBar ReplaySession] Using scheme: ${scheme}`);
          
          // Build archive command
          const archiveArgs = [
            '-scheme', scheme,
            '-configuration', 'Release',
            '-destination', 'generic/platform=iOS',
            '-archivePath', archivePath,
            'archive',
            'CODE_SIGN_STYLE=Automatic'
          ];
          
          if (isWorkspace) {
            archiveArgs.unshift('-workspace', projectFile);
          } else {
            archiveArgs.unshift('-project', projectFile);
          }
          
          console.log('[BitBar ReplaySession] Starting archive build...');
          console.log('[BitBar ReplaySession] Archive command: xcodebuild', archiveArgs.join(' '));
          console.log('[BitBar ReplaySession] This may take several minutes...');
          
          // Execute archive command with enhanced logging
          await new Promise<void>((resolve, reject) => {
            const startTime = Date.now();
            const archiveProcess = spawn('xcodebuild', archiveArgs, {
              cwd: currentDir,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            let lastLogTime = startTime;
            
            // Log progress every 30 seconds
            const progressInterval = setInterval(() => {
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              console.log(`[BitBar ReplaySession] Archive still in progress... (${elapsed}s elapsed)`);
            }, 30000);
            
            archiveProcess.stdout?.on('data', (data) => {
              const output = data.toString();
              stdout += output;
              
              // Log important stdout messages
              const lines = output.split('\n').filter((line: string) => line.trim());
              for (const line of lines) {
                if (line.includes('error') || line.includes('warning') || line.includes('Building') || line.includes('Archiving')) {
                  console.log('[BitBar ReplaySession] Archive stdout:', line.trim());
                }
              }
            });
            
            archiveProcess.stderr?.on('data', (data) => {
              const output = data.toString();
              stderr += output;
              console.log('[BitBar ReplaySession] Archive stderr:', output.trim());
            });
            
            archiveProcess.on('close', (code) => {
              clearInterval(progressInterval);
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              
              if (code === 0) {
                console.log(`[BitBar ReplaySession] Archive completed successfully in ${elapsed}s`);
                console.log('[BitBar ReplaySession] Verifying archive exists at:', archivePath);
                
                if (fs.existsSync(archivePath)) {
                  console.log('[BitBar ReplaySession] Archive file verified successfully');
                  resolve();
                } else {
                  console.error('[BitBar ReplaySession] ERROR: Archive file not found at expected path');
                  reject(new Error(`Archive file not found at ${archivePath}`));
                }
              } else {
                console.error(`[BitBar ReplaySession] Archive build failed with exit code: ${code}`);
                console.error('[BitBar ReplaySession] Full stderr output:', stderr);
                if (stderr.length > 1000) {
                  console.error('[BitBar ReplaySession] Stderr truncated, full output available in logs');
                }
                reject(new Error(`Archive build failed with exit code ${code}: ${stderr.substring(0, 1000)}`));
              }
            });
            
            archiveProcess.on('error', (error) => {
              clearInterval(progressInterval);
              console.error('[BitBar ReplaySession] Failed to start xcodebuild process:', error.message);
              reject(new Error(`Failed to start xcodebuild: ${error.message}`));
            });
          });
          
          // Export IPA command
          const exportArgs = [
            '-exportArchive',
            '-archivePath', archivePath,
            '-exportPath', exportPath,
            '-exportOptionsPlist', exportOptionsPlist
          ];
          
          console.log('[BitBar ReplaySession] Starting IPA export...');
          console.log('[BitBar ReplaySession] Export command: xcodebuild', exportArgs.join(' '));
          console.log('[BitBar ReplaySession] Export may take a few minutes...');
          
          // Execute export command with enhanced logging
          await new Promise<void>((resolve, reject) => {
            const startTime = Date.now();
            const exportProcess = spawn('xcodebuild', exportArgs, {
              cwd: currentDir,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            // Log progress every 30 seconds
            const progressInterval = setInterval(() => {
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              console.log(`[BitBar ReplaySession] Export still in progress... (${elapsed}s elapsed)`);
            }, 30000);
            
            exportProcess.stdout?.on('data', (data) => {
              const output = data.toString();
              stdout += output;
              
              // Log important stdout messages
              const lines = output.split('\n').filter((line: string) => line.trim());
              for (const line of lines) {
                if (line.includes('error') || line.includes('warning') || line.includes('Exporting') || line.includes('Export succeeded')) {
                  console.log('[BitBar ReplaySession] Export stdout:', line.trim());
                }
              }
            });
            
            exportProcess.stderr?.on('data', (data) => {
              const output = data.toString();
              stderr += output;
              console.log('[BitBar ReplaySession] Export stderr:', output.trim());
            });
            
            exportProcess.on('close', (code) => {
              clearInterval(progressInterval);
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              
              if (code === 0) {
                console.log(`[BitBar ReplaySession] Export completed successfully in ${elapsed}s`);
                console.log('[BitBar ReplaySession] Verifying export directory exists at:', exportPath);
                
                if (fs.existsSync(exportPath)) {
                  const exportedFiles = fs.readdirSync(exportPath);
                  console.log('[BitBar ReplaySession] Files in export directory:', exportedFiles);
                  resolve();
                } else {
                  console.error('[BitBar ReplaySession] ERROR: Export directory not found');
                  reject(new Error(`Export directory not found at ${exportPath}`));
                }
              } else {
                console.error(`[BitBar ReplaySession] Export failed with exit code: ${code}`);
                console.error('[BitBar ReplaySession] Full stderr output:', stderr);
                reject(new Error(`IPA export failed with exit code ${code}: ${stderr.substring(0, 1000)}`));
              }
            });
            
            exportProcess.on('error', (error) => {
              clearInterval(progressInterval);
              console.error('[BitBar ReplaySession] Failed to start export process:', error.message);
              reject(new Error(`Failed to start xcodebuild for export: ${error.message}`));
            });
          });
          
          // Find and rename the exported IPA file
          console.log('[BitBar ReplaySession] Looking for exported IPA file...');
          const exportedFiles = fs.readdirSync(exportPath);
          console.log('[BitBar ReplaySession] All files in export directory:', exportedFiles);
          
          const ipaFile = exportedFiles.find(file => file.endsWith('.ipa'));
          
          if (!ipaFile) {
            console.error('[BitBar ReplaySession] ERROR: No IPA file found in export directory');
            console.error('[BitBar ReplaySession] Available files:', exportedFiles);
            throw new Error('No IPA file found in export directory');
          }
          
          console.log('[BitBar ReplaySession] Found IPA file:', ipaFile);
          
          const originalIpaPath = path.join(exportPath, ipaFile);
          const timestampedIpaName = `${iOSProjectName}_${formattedTimestamp}.ipa`;
          const finalIpaPath = path.join(exportPath, timestampedIpaName);
          
          console.log('[BitBar ReplaySession] Renaming IPA file...');
          console.log('[BitBar ReplaySession] From:', originalIpaPath);
          console.log('[BitBar ReplaySession] To:', finalIpaPath);
          
          fs.renameSync(originalIpaPath, finalIpaPath);
          console.log('[BitBar ReplaySession] IPA file renamed successfully');
          
          const stats = fs.statSync(finalIpaPath);
          console.log('[BitBar ReplaySession] Final IPA file size:', Math.round(stats.size / 1024 / 1024 * 100) / 100, 'MB');
          ipaResult = {
            success: true,
            ipaPath: finalIpaPath,
            ipaName: timestampedIpaName,
            projectName: iOSProjectName,
            timestamp: formattedTimestamp,
            fileSize: stats.size
          };
          
          console.log('[BitBar ReplaySession] Step 2 completed: IPA file built');
          
          // Step 3: Upload both files to BitBar
          console.log('[BitBar ReplaySession] Step 3: Uploading files to BitBar...');
          
          // Upload test package
          console.log('[BitBar ReplaySession] Reading test package file...');
          console.log('[BitBar ReplaySession] Test package path:', zipPath);
          console.log('[BitBar ReplaySession] Test package size:', Math.round(fs.statSync(zipPath).size / 1024), 'KB');
          
          const testPackageBuffer = fs.readFileSync(zipPath);
          const testPackageBase64 = testPackageBuffer.toString('base64');
          console.log('[BitBar ReplaySession] Test package converted to base64, length:', testPackageBase64.length);
          
          console.log('[BitBar ReplaySession] Uploading test package to BitBar...');
          const testPackageUploadResult = await this.uploadFile({
            filename: zipFilename,
            fileContent: testPackageBase64,
            contentType: 'application/zip'
          });
          testPackageFileId = testPackageUploadResult.id;
          console.log('[BitBar ReplaySession] Test package uploaded successfully, file ID:', testPackageFileId);
          
          // Upload IPA file
          console.log('[BitBar ReplaySession] Reading IPA file...');
          console.log('[BitBar ReplaySession] IPA path:', finalIpaPath);
          console.log('[BitBar ReplaySession] IPA size:', Math.round(stats.size / 1024 / 1024 * 100) / 100, 'MB');
          
          const ipaBuffer = fs.readFileSync(finalIpaPath);
          const ipaBase64 = ipaBuffer.toString('base64');
          console.log('[BitBar ReplaySession] IPA converted to base64, length:', ipaBase64.length);
          
          console.log('[BitBar ReplaySession] Uploading IPA to BitBar...');
          const ipaUploadResult = await this.uploadFile({
            filename: timestampedIpaName,
            fileContent: ipaBase64,
            contentType: 'application/octet-stream'
          });
          ipaFileId = ipaUploadResult.id;
          console.log('[BitBar ReplaySession] IPA uploaded successfully, file ID:', ipaFileId);
          
          console.log('[BitBar ReplaySession] Step 3 completed: Files uploaded to BitBar');
          console.log('[BitBar ReplaySession] Test package file ID:', testPackageFileId);
          console.log('[BitBar ReplaySession] IPA file ID:', ipaFileId);
          
          // Step 4: Start BitBar test with hardcoded device 114152
          console.log('[BitBar ReplaySession] Step 4: Starting BitBar test run...');
          
          const testRunName = args.testRunName || `${iOSProjectName}_automated_test_${formattedTimestamp}`;
          
          // Get iOS framework ID (assuming it's available)
          const frameworksResponse = await this.listFrameworks();
          const iosFramework = frameworksResponse.data?.find((f: any) => 
            f.name?.toLowerCase().includes('ios') || 
            f.name?.toLowerCase().includes('appium')
          );
          
          if (!iosFramework) {
            throw new Error('No suitable iOS testing framework found in BitBar');
          }
          
          const testRunArgs = {
            osType: 'IOS' as const,
            projectId: args.projectId,
            files: [
              { id: ipaFileId!, action: 'INSTALL' as const },
              { id: testPackageFileId!, action: 'RUN_TEST' as const }
            ],
            frameworkId: "542",
            deviceIds: ['114152'], // Hardcoded device ID as requested
            testRunName: testRunName,
            scheduler: 'PARALLEL' as const,
            timeout: 3600, // 1 hour timeout
            videoRecordingEnabled: true
          };
          
          const testRunResult = await this.createTestRun(testRunArgs);
          
          console.log('[BitBar ReplaySession] Step 4 completed: Test run started');
          console.log('[BitBar ReplaySession] Test run ID:', testRunResult.id);
          
          // Return comprehensive results
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                success: true,
                workflow: 'complete_ios_test',
                steps: {
                  testPackage: {
                    completed: true,
                    result: testPackageResult,
                    fileId: testPackageFileId
                  },
                  ipaFile: {
                    completed: true,
                    result: ipaResult,
                    fileId: ipaFileId
                  },
                  testRun: {
                    completed: true,
                    result: testRunResult,
                    runId: testRunResult.id,
                    deviceId: '114152'
                  }
                },
                summary: {
                  projectName: iOSProjectName,
                  bundleId: bundleId,
                  timestamp: formattedTimestamp,
                  testRunId: testRunResult.id,
                  testRunName: testRunName,
                  deviceId: '114152',
                  frameworkUsed: iosFramework.name
                },
                message: `Complete iOS test workflow executed successfully. Test run ${testRunResult.id} started on device 114152.`
              }, null, 2)
            }],
          };
          
        } catch (error) {
          console.error('[BitBar ReplaySession] Workflow error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({ 
                error: true, 
                workflow: 'complete_ios_test',
                message: errorMessage,
                completedSteps: {
                  testPackage: testPackageResult !== null,
                  ipaFile: ipaResult !== null,
                  fileUploads: testPackageFileId !== null && ipaFileId !== null,
                  testRun: false
                },
                fileIds: {
                  testPackage: testPackageFileId,
                  ipaFile: ipaFileId
                },
                timestamp: new Date().toISOString(),
                suggestions: [
                  'Ensure you are in an iOS project directory',
                  'Verify Xcode is installed and configured properly',
                  'Check that the iOS project builds successfully in Xcode',
                  'Ensure valid BitBar project ID is provided',
                  'Verify BitBar API access and permissions'
                ]
              }, null, 2) 
            }],
          };
        }
      }
    );
  }

  registerResources(server: McpServer): void {
    server.resource(
      "ios_test_requirements",
      new ResourceTemplate("bitbar://templates/requirements.txt", { list: undefined }),
      async (uri) => {
        try {
          const requirementsContent = `Appium-Python-Client==2.11.1
selenium==4.10.0
xmlrunner==1.7.7`;

          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/plain",
              text: requirementsContent
            }]
          }
        } catch (e) {
          throw new Error(`Failed to generate requirements.txt: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    );

    server.resource(
      "ios_test_run_tests_sh",
      new ResourceTemplate("bitbar://templates/run-tests.sh", { list: undefined }),
      async (uri) => {
        try {
          const runTestsContent = `#!/bin/bash

# Name of the test file
TEST=\${TEST:="BitBarAppTest.py"}

echo "Extracting tests.zip..."
unzip -o tests.zip


#########################################################
#
# Installing required Python libraries
#  - required libraries are in requirement.txt file that
#    is uploaded with this script file
#
#########################################################

echo "Installing requirements from requirements.txt"
chmod 0444 requirements.txt
pip3 install -r requirements.txt

#########################################################
#
# Preparing to start Appium
# - UDID is the device ID on which test will run and
#   required parameter on iOS test runs
# - appium - is a wrapper tha calls the latest installed
#   Appium server. Additional parameters can be passed
#   to the server here.
#
#########################################################

echo "UDID set to \${IOS_UDID}"
echo "Starting Appium ..."
appium --log-no-colors --log-timestamp


#########################################################
#
# Setting of environment variables used later in test
# - used for Appium desired capabilities
# - note, APPIUM_URL is same for local and cloud server
#   runs
#########################################################
export APPIUM_APPFILE="\$PWD/application.ipa"
export APPIUM_URL="http://localhost:4723/wd/hub"
export APPIUM_DEVICE="Local Device"
export APPIUM_PLATFORM="IOS"
export APPIUM_AUTOMATION="XCUITest"

## Clean local screenshots directory
rm -rf screenshots

## Start test execution
echo "Running test \${TEST}"
python3 \${TEST}

#########################################################
#
# Get test report
# - do any test result post processing your test results
#   need here
# - also any additional files can be retrieved here
# - retrieve files from device
#
#########################################################
mv test-reports/*.xml TEST-all.xml`;

          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/plain",
              text: runTestsContent
            }]
          }
        } catch (e) {
          throw new Error(`Failed to generate run-tests.sh: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    );

    server.resource(
      "ios_test_app_script",
      new ResourceTemplate("bitbar://templates/BitBarAppTest.py", { list: undefined }),
      async (uri) => {
        try {
          // Extract test_steps from URI parameters
          const url = new URL(uri.href);
          const testSteps = url.searchParams.get('test_steps') || `# Default iOS test steps - launch app and take screenshot
            log("� App launched successfully")
            log("📸 Taking screenshot: app_launch.png")
            driver.save_screenshot(self.screenshot_dir + "/app_launch.png")
            log("✅ Test completed successfully")`;

          const pythonTestContent = `#
#  iOS Appium Test Script for BitBar
#

import unittest
from time import sleep

import xmlrunner
from appium.webdriver.common.appiumby import AppiumBy
from selenium.common.exceptions import WebDriverException

from BitBarAppiumTest import BitBarAppiumTest, log


class BitBarAppTest(BitBarAppiumTest):
    def setUp(self):
        # BitBarAppiumTest takes settings (local or cloud) from environment variables
        super(BitBarAppTest, self).setUp()

    # iOS Appium test
    def test_the_app(self):
        driver = self.get_driver()  # Initialize Appium connection to device

        sleep(10)  # Wait that the app loads
        log("Start iOS test!")
        
        # Use this to get detected screen hierarchy
        # print self.driver.page_source

        try:
${testSteps.split('\n').map(line => '            ' + line).join('\n')}
            
        except WebDriverException:
            log("iOS test run failed..")
    # Test end.


if __name__ == '__main__':
    unittest.main(testRunner=xmlrunner.XMLTestRunner(output='test-reports'))`;

          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/x-python",
              text: pythonTestContent
            }]
          }
        } catch (e) {
          throw new Error(`Failed to generate BitBarAppTest.py: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    );

    server.resource(
      "ios_test_appium_script",
      new ResourceTemplate("bitbar://templates/BitBarAppiumTest.py", { list: undefined }),
      async (uri) => {
        try {
          // Extract bundle_id from URI parameters
          const url = new URL(uri.href);
          const bundleId = url.searchParams.get('bundle_id');
          
          if (!bundleId) {
            throw new Error('bundle_id parameter is required for ios_test_appium_script resource');
          }

          const appiumTestContent = `# -*- coding: UTF-8 -*-

#
# Copyright(C) 2023 SmartBear Software
#
# iOS-specific Appium test base class for BitBar testing
#

import os
import pprint
import sys
import time
import unittest

from appium import webdriver


def log(msg):
    header = ''
    if os.environ.get('APPIUM_DEVICE'):
        header = f"[{os.environ.get('APPIUM_DEVICE')}]"
    print(f'{header} {time.strftime("%H:%M:%S")}: {msg}')
    sys.stdout.flush()


class BitBarAppiumTest(unittest.TestCase):
    # Appium for iOS testing
    driver = None
    platform_name = 'iOS'  # Fixed to iOS
    automation_name = 'XCUITest'  # Default iOS automation
    appium_url = None
    application_file = None
    device_name = None
    browser_name = None

    screenshot_dir = None
    # iOS specific - configurable bundle ID
    bundle_id = '${bundleId}'

    # Automatically resolved
    resolution = None

    def setUp(self, appium_url='http://localhost:4723/wd/hub', bundle_id='${bundleId}',
              application_file=None, browser_name=None, screenshot_dir=None,
              automation_name='XCUITest', noReset=None, fullReset=None):
        self.appium_url = os.environ.get('APPIUM_URL') or appium_url
        self.platform_name = 'iOS'  # Fixed to iOS

        self.bundle_id = bundle_id or os.environ.get('APPIUM_BUNDLEID') or '${bundleId}'

        self.automation_name = automation_name or os.environ.get('APPIUM_AUTOMATION') or 'XCUITest'

        self.application_file = application_file or os.environ.get('APPIUM_APPFILE')
        self.browser_name = browser_name or os.environ.get('APPIUM_BROWSER')

        self.device_name = os.environ.get('APPIUM_DEVICE') or self.device_name

        if screenshot_dir:
            self.set_screenshot_dir(screenshot_dir)
        else:
            self.set_screenshot_dir(f'{os.getcwd()}/screenshots')
        self.fullReset = fullReset or False
        self.noReset = noReset or True
        # Initialize WebDriver
        self.get_driver()

    def tearDown(self):
        self.driver.quit()

    def set_application_file(self, file):
        self.application_file = file

    def set_screenshot_dir(self, screenshot_dir):
        log(f'Will save screenshots at: {screenshot_dir}')
        self.screenshot_dir = screenshot_dir
        if not os.path.exists(screenshot_dir):
            log(f'Creating directory {screenshot_dir}')
            os.mkdir(self.screenshot_dir)

    def get_desired_capabilities(self):
        capabilities = {
            'platformName': 'iOS',
            'appium:automationName': self.automation_name,
            'appium:deviceName': self.device_name
        }
        if self.bundle_id:
            log(f'Using bundleId {self.bundle_id}')
            capabilities['appium:bundleId'] = self.bundle_id
        if self.application_file:
            log(f'Using application file {self.application_file}')
            capabilities['appium:app'] = self.application_file
        if self.browser_name:
            log(f'Using mobile browser {self.browser_name}')
            capabilities['browserName'] = self.browser_name

        log(pprint.pformat(capabilities))
        return capabilities

    def get_driver(self):
        if self.driver:
            return self.driver
            # set up WebDriver
        log(f'Connecting WebDriver to {self.appium_url}')
        self.driver = webdriver.Remote(self.appium_url, self.get_desired_capabilities())
        # Wait max 30 seconds for elements
        self.driver.implicitly_wait(30)

        log('WebDriver response received')
        return self.driver

    def isIOS(self):
        return True  # Always iOS for this test class`;

          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/x-python",
              text: appiumTestContent
            }]
          }
        } catch (e) {
          throw new Error(`Failed to generate BitBarAppiumTest.py: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    );
  }
}
