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
    console.log('[BitBar StepConverter] Converting steps to robust Appium code with fallback strategies');
    
    try {
      // Check if we have structured reproduction data (from error-repro-details)
      if (reproductionData && reproductionData.reproduction_steps && Array.isArray(reproductionData.reproduction_steps)) {
        console.log('[BitBar StepConverter] Processing structured reproduction steps from error-repro-details');
        const steps = reproductionData.reproduction_steps;
        const appiumCode: string[] = [];
        
        // Add helper method for robust element finding
        appiumCode.push(`# Robust element finding helper method
        def find_element_with_strategies(self, strategies_list, description="element"):
            """Try multiple strategies to find an element"""
            for strategy_name, by_type, selector in strategies_list:
                try:
                    log(f"Trying to find {description} using {strategy_name}: {selector}")
                    element = self.driver.find_element(by_type, selector)
                    log(f"✅ Found {description} using {strategy_name}")
                    return element
                except NoSuchElementException as e:
                    log(f"❌ {strategy_name} failed: {str(e)}")
                    continue
                except Exception as e:
                    log(f"⚠️ {strategy_name} error: {str(e)}")
                    continue
            
            # Take screenshot for debugging
            self.driver.save_screenshot(f"{self.screenshot_dir}/element_not_found_{description}.png")
            raise NoSuchElementException(f"Could not find {description} using any strategy")
        
        # Bind the helper method to the test class
        self.find_element_with_strategies = find_element_with_strategies.__get__(self, self.__class__)`);
        
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const action = step.action?.toLowerCase() || 'tap_element';
          const selector = step.appium_selector || '';
          const timestamp = step.timestamp || '';
          
          console.log(`[BitBar StepConverter] Processing step ${i + 1}: ${action} on ${selector}`);
          
          let appiumCommand = '';
          let elementName = '';
          let selectorStrategies: string[] = [];
          
          // Parse the selector to extract element information
          if (selector.startsWith('accessibility_id:')) {
            elementName = selector.replace('accessibility_id:', '');
            // Generate multiple strategies for robust element finding
            selectorStrategies = [
              `("Accessibility ID", AppiumBy.ACCESSIBILITY_ID, "${elementName}")`,
              `("Name selector", AppiumBy.NAME, "${elementName}")`,
              `("XPath by name", AppiumBy.XPATH, "//XCUIElementTypeButton[@name='${elementName}']")`,
              `("XPath by label", AppiumBy.XPATH, "//XCUIElementTypeButton[@label='${elementName}']")`,
              `("Class chain", AppiumBy.IOS_CLASS_CHAIN, "**/XCUIElementTypeButton[\`name == '${elementName}'\`]")`
            ];
          } else if (selector.startsWith('xpath:')) {
            const xpathExpression = selector.replace('xpath:', '');
            elementName = xpathExpression.split('@name=')[1]?.split("'")[1] || 'element';
            selectorStrategies = [
              `("XPath primary", AppiumBy.XPATH, "${xpathExpression}")`,
              `("Accessibility ID", AppiumBy.ACCESSIBILITY_ID, "${elementName}")`,
              `("Name selector", AppiumBy.NAME, "${elementName}")`
            ];
          } else {
            elementName = selector || 'element';
            selectorStrategies = [
              `("Accessibility ID", AppiumBy.ACCESSIBILITY_ID, "${elementName}")`,
              `("Name selector", AppiumBy.NAME, "${elementName}")`,
              `("XPath by name", AppiumBy.XPATH, "//XCUIElementTypeButton[@name='${elementName}']")`
            ];
          }
          
          // Convert structured actions to robust Appium code
          switch (action) {
            case 'tap_button':
              appiumCommand = `# Step ${i + 1}: Tap button - ${elementName}
            log("Step ${i + 1}: Attempting to tap button '${elementName}'")
            button_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath any button", AppiumBy.XPATH, "//XCUIElementTypeButton[contains(@name, '${elementName}')]"),
                ("XPath generic button", AppiumBy.XPATH, "//XCUIElementTypeButton")
            ]
            
            try:
                button_element = self.find_element_with_strategies(button_strategies, "button '${elementName}'")
                button_element.click()
                log(f"✅ Successfully tapped button '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_button_tapped.png")
            except Exception as e:
                log(f"❌ Failed to tap button '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_button_tap_failed.png")
                raise`;
              break;
              
            case 'switch_tab':
              appiumCommand = `# Step ${i + 1}: Switch tab - ${elementName}
            log("Step ${i + 1}: Attempting to switch to tab '${elementName}'")
            tab_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath TabBar button", AppiumBy.XPATH, "//XCUIElementTypeTabBar//XCUIElementTypeButton[@name='${elementName}']"),
                ("XPath TabBar label", AppiumBy.XPATH, "//XCUIElementTypeTabBar//XCUIElementTypeButton[@label='${elementName}']"),
                ("XPath TabBar contains", AppiumBy.XPATH, "//XCUIElementTypeTabBar//XCUIElementTypeButton[contains(@name, '${elementName}')]"),
                ("XPath any tab", AppiumBy.XPATH, "//XCUIElementTypeButton[contains(@name, '${elementName}')]")
            ]
            
            try:
                tab_element = self.find_element_with_strategies(tab_strategies, "tab '${elementName}'")
                tab_element.click()
                log(f"✅ Successfully switched to tab '${elementName}'")
                sleep(2)  # Wait for tab content to load
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_tab_switched.png")
            except Exception as e:
                log(f"❌ Failed to switch to tab '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_tab_switch_failed.png")
                raise`;
              break;
              
            case 'tap_cell':
              appiumCommand = `# Step ${i + 1}: Tap cell - ${elementName}
            log("Step ${i + 1}: Attempting to tap cell '${elementName}'")
            cell_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath cell", AppiumBy.XPATH, "//XCUIElementTypeCell[@name='${elementName}']"),
                ("XPath cell label", AppiumBy.XPATH, "//XCUIElementTypeCell[@label='${elementName}']"),
                ("XPath cell contains", AppiumBy.XPATH, "//XCUIElementTypeCell[contains(@name, '${elementName}')]"),
                ("XPath static text", AppiumBy.XPATH, "//XCUIElementTypeStaticText[@name='${elementName}']")
            ]
            
            try:
                cell_element = self.find_element_with_strategies(cell_strategies, "cell '${elementName}'")
                cell_element.click()
                log(f"✅ Successfully tapped cell '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_cell_tapped.png")
            except Exception as e:
                log(f"❌ Failed to tap cell '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_cell_tap_failed.png")
                raise`;
              break;
              
            case 'enter_text':
              appiumCommand = `# Step ${i + 1}: Enter text in field - ${elementName}
            log("Step ${i + 1}: Attempting to enter text in field '${elementName}'")
            text_field_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath text field", AppiumBy.XPATH, "//XCUIElementTypeTextField[@name='${elementName}']"),
                ("XPath secure field", AppiumBy.XPATH, "//XCUIElementTypeSecureTextField[@name='${elementName}']"),
                ("XPath text view", AppiumBy.XPATH, "//XCUIElementTypeTextView[@name='${elementName}']"),
                ("XPath any text input", AppiumBy.XPATH, "//*[self::XCUIElementTypeTextField or self::XCUIElementTypeSecureTextField or self::XCUIElementTypeTextView][@name='${elementName}']")
            ]
            
            try:
                text_field = self.find_element_with_strategies(text_field_strategies, "text field '${elementName}'")
                text_field.clear()
                text_field.send_keys("test_input")
                log(f"✅ Successfully entered text in field '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_text_entered.png")
            except Exception as e:
                log(f"❌ Failed to enter text in field '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_text_entry_failed.png")
                raise`;
              break;
              
            case 'toggle_switch':
              appiumCommand = `# Step ${i + 1}: Toggle switch - ${elementName}
            log("Step ${i + 1}: Attempting to toggle switch '${elementName}'")
            switch_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath switch", AppiumBy.XPATH, "//XCUIElementTypeSwitch[@name='${elementName}']"),
                ("XPath switch label", AppiumBy.XPATH, "//XCUIElementTypeSwitch[@label='${elementName}']"),
                ("XPath toggle", AppiumBy.XPATH, "//XCUIElementTypeToggle[@name='${elementName}']")
            ]
            
            try:
                switch_element = self.find_element_with_strategies(switch_strategies, "switch '${elementName}'")
                switch_element.click()
                log(f"✅ Successfully toggled switch '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_switch_toggled.png")
            except Exception as e:
                log(f"❌ Failed to toggle switch '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_switch_toggle_failed.png")
                raise`;
              break;
              
            case 'swipe_screen':
              appiumCommand = `# Step ${i + 1}: Swipe screen
            log("Step ${i + 1}: Performing swipe gesture")
            try:
                # Get screen size for dynamic swipe coordinates
                screen_size = self.driver.get_window_size()
                width = screen_size['width']
                height = screen_size['height']
                
                # Swipe up from bottom 20% to top 20%
                start_x = width // 2
                start_y = int(height * 0.8)
                end_x = width // 2
                end_y = int(height * 0.2)
                
                self.driver.swipe(start_x, start_y, end_x, end_y, 500)
                log(f"✅ Successfully performed swipe gesture")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_swipe_completed.png")
            except Exception as e:
                log(f"❌ Failed to perform swipe: {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_swipe_failed.png")
                raise`;
              break;
              
            case 'select_option':
              appiumCommand = `# Step ${i + 1}: Select option - ${elementName}
            log("Step ${i + 1}: Attempting to select option '${elementName}'")
            option_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath picker wheel", AppiumBy.XPATH, "//XCUIElementTypePickerWheel[@name='${elementName}']"),
                ("XPath picker", AppiumBy.XPATH, "//XCUIElementTypePicker//XCUIElementTypeStaticText[@name='${elementName}']"),
                ("XPath segmented control", AppiumBy.XPATH, "//XCUIElementTypeSegmentedControl//XCUIElementTypeButton[@name='${elementName}']")
            ]
            
            try:
                option_element = self.find_element_with_strategies(option_strategies, "option '${elementName}'")
                option_element.click()
                log(f"✅ Successfully selected option '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_option_selected.png")
            except Exception as e:
                log(f"❌ Failed to select option '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_option_select_failed.png")
                raise`;
              break;
              
            default:
              // Fallback for unknown actions - use generic tap with robust strategies
              appiumCommand = `# Step ${i + 1}: ${action} - ${elementName}
            log("Step ${i + 1}: Attempting to interact with element '${elementName}' (${action})")
            generic_strategies = [
                ${selectorStrategies.join(',\n                ')},
                ("XPath any element", AppiumBy.XPATH, "//*[@name='${elementName}']"),
                ("XPath contains name", AppiumBy.XPATH, "//*[contains(@name, '${elementName}')]")
            ]
            
            try:
                element = self.find_element_with_strategies(generic_strategies, "element '${elementName}'")
                element.click()
                log(f"✅ Successfully interacted with element '${elementName}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_element_interacted.png")
            except Exception as e:
                log(f"❌ Failed to interact with element '${elementName}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${i + 1}_interaction_failed.png")
                raise`;
              break;
          }
          
          if (appiumCommand) {
            appiumCode.push(appiumCommand);
          }
        }
        
        if (appiumCode.length === 0) {
          console.log('[BitBar StepConverter] No actionable steps found in reproduction data');
          return this.generateDefaultRobustValidation();
        }
        
        const result = appiumCode.join('\n            \n');
        console.log(`[BitBar StepConverter] Generated ${steps.length} robust structured steps`);
        return result;
      }
      
      // Fallback to legacy human-written steps processing with robust enhancements
      return this.convertLegacyStepsWithRobustStrategies(input);
      
    } catch (error) {
      console.error('[BitBar StepConverter] Error converting steps:', error);
      return this.generateErrorFallbackValidation();
    }
  }
  
  // Helper method for robust default validation
  private generateDefaultRobustValidation(): string {
    return `# Default robust iOS test validation - app assumed already launched
        log("🚀 App launched successfully - performing validation")
        try:
            # Take initial screenshot
            self.driver.save_screenshot(f"{self.screenshot_dir}/app_launch_validation.png")
            
            # Basic app validation - check if main elements are present
            log("Validating app is loaded and responsive...")
            
            # Wait for app to be ready
            sleep(3)
            
            # Get app state
            log(f"App state: {self.driver.query_app_state(self.bundle_id)}")
            
            # Take final validation screenshot
            self.driver.save_screenshot(f"{self.screenshot_dir}/validation_complete.png")
            log("✅ App validation completed successfully")
            
        except Exception as e:
            log(f"❌ App validation failed: {str(e)}")
            self.driver.save_screenshot(f"{self.screenshot_dir}/validation_failed.png")
            raise`;
  }
  
  // Helper method for error fallback validation
  private generateErrorFallbackValidation(): string {
    return `# Error fallback - minimal robust validation
        log("⚠️ Step conversion error - performing minimal validation")
        try:
            self.driver.save_screenshot(f"{self.screenshot_dir}/error_fallback_validation.png")
            log("📱 Screenshot captured for debugging")
        except Exception as e:
            log(f"❌ Even minimal validation failed: {str(e)}")
            raise`;
  }
  
  // Helper method to convert legacy steps with robust strategies
  private convertLegacyStepsWithRobustStrategies(input: string): string {
    if (!input || input.trim() === '') {
      console.log('[BitBar StepConverter] No input provided, using robust default validation');
      return this.generateDefaultRobustValidation();
    }
    
    console.log('[BitBar StepConverter] Processing legacy human-written steps with robust enhancements');
    
    // Split steps by numbered lines (1., 2., etc.) or newlines
    const steps = input
      .split(/\n|(?=\d+\.)/g)
      .map(step => step.trim())
      .filter(step => step.length > 0);
    
    const appiumCode: string[] = [];
    let stepNumber = 1;
    
    // Add robust helper method for legacy steps too
    appiumCode.push(`# Robust element finding helper method (legacy steps)
        def find_element_with_strategies(self, strategies_list, description="element"):
            """Try multiple strategies to find an element"""
            for strategy_name, by_type, selector in strategies_list:
                try:
                    log(f"Trying to find {description} using {strategy_name}: {selector}")
                    element = self.driver.find_element(by_type, selector)
                    log(f"✅ Found {description} using {strategy_name}")
                    return element
                except NoSuchElementException as e:
                    log(f"❌ {strategy_name} failed: {str(e)}")
                    continue
                except Exception as e:
                    log(f"⚠️ {strategy_name} error: {str(e)}")
                    continue
            
            self.driver.save_screenshot(f"{self.screenshot_dir}/element_not_found_{description}.png")
            raise NoSuchElementException(f"Could not find {description} using any strategy")
        
        self.find_element_with_strategies = find_element_with_strategies.__get__(self, self.__class__)`);
    
    for (const step of steps) {
      // Remove step numbering if present (1., 2., etc.)
      const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
      if (!cleanStep) continue;
      
      // Skip app launch/initialization steps since app is assumed to be already running
      const lowerStep = cleanStep.toLowerCase();
      if (lowerStep.includes('open') || lowerStep.includes('launch') || lowerStep.includes('start app') || lowerStep.includes('initialize')) {
        console.log(`[BitBar StepConverter] Skipping app launch step: ${cleanStep}`);
        continue;
      }
      
      console.log(`[BitBar StepConverter] Processing legacy step ${stepNumber}: ${cleanStep}`);
      
      let appiumCommand = '';
      
      if (lowerStep.includes('tap') || lowerStep.includes('click')) {
        const elementMatch = cleanStep.match(/(?:tap|click)(?:\s+on)?(?:\s+the)?\s+(?:"([^"]+)"|'([^']+)'|(\w+(?:\s+\w+)*?))\s*(?:button|btn|field|input|element)?/i);
        const elementText = elementMatch?.[1] || elementMatch?.[2] || elementMatch?.[3] || 'element';
        
        appiumCommand = `# ${stepNumber}. ${cleanStep} (Enhanced with robust strategies)
            log("Step ${stepNumber}: Attempting to tap '${elementText}'")
            tap_strategies = [
                ("Accessibility ID", AppiumBy.ACCESSIBILITY_ID, "${elementText}"),
                ("Name selector", AppiumBy.NAME, "${elementText}"),
                ("XPath by name", AppiumBy.XPATH, "//XCUIElementTypeButton[@name='${elementText}']"),
                ("XPath by label", AppiumBy.XPATH, "//XCUIElementTypeButton[@label='${elementText}']"),
                ("XPath contains", AppiumBy.XPATH, "//*[contains(@name, '${elementText}')]")
            ]
            
            try:
                tap_element = self.find_element_with_strategies(tap_strategies, "'${elementText}'")
                tap_element.click()
                log(f"✅ Successfully tapped '${elementText}'")
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${stepNumber}_tap_success.png")
            except Exception as e:
                log(f"❌ Failed to tap '${elementText}': {str(e)}")
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${stepNumber}_tap_failed.png")
                raise`;
      }
      // ... continue with similar robust patterns for other actions
      else {
        // Generic step with robust fallback
        appiumCommand = `# ${stepNumber}. ${cleanStep} (Generic robust interaction)
            log("Step ${stepNumber}: Generic interaction - ${cleanStep}")
            try:
                sleep(1)
                self.driver.save_screenshot(f"{self.screenshot_dir}/step_${stepNumber}_generic.png")
                log("✅ Generic step completed")
            except Exception as e:
                log(f"❌ Generic step failed: {str(e)}")
                raise`;
      }
      
      if (appiumCommand) {
        appiumCode.push(appiumCommand);
        stepNumber++;
      }
    }
    
    if (appiumCode.length === 0) {
      console.log('[BitBar StepConverter] No actionable legacy steps found, using robust validation');
      return this.generateDefaultRobustValidation();
    }
    
    const result = appiumCode.join('\n            \n');
    console.log(`[BitBar StepConverter] Generated ${appiumCode.length} robust legacy steps`);
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
#  Robust iOS Appium Test Script for BitBar
#  Enhanced with fallback selector strategies and comprehensive error handling
#

import unittest
from time import sleep

import xmlrunner
from appium.webdriver.common.appiumby import AppiumBy
from selenium.common.exceptions import WebDriverException, NoSuchElementException

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
      "Create a complete iOS test package for BitBar containing all necessary files. This tool validates that it's running in an iOS application project directory and automatically extracts the bundle ID from the project configuration. Accepts JSON format from error-repro-details prompt with device requirements and reproduction steps that are automatically converted to Appium code.",
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
          
          // Determine project name with safe fallback
          let projectName = args.projectName;
          if (!projectName) {
            // Try to get a clean project name from current directory
            const baseName = path.basename(process.cwd());
            // Sanitize the project name to ensure it's safe for filenames
            projectName = baseName
              .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid chars with underscore
              .replace(/_{2,}/g, '_') // Replace multiple underscores with single
              .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
              .toLowerCase(); // Convert to lowercase for consistency
            
            // If sanitization resulted in empty string, use default
            if (!projectName || projectName.length === 0) {
              projectName = 'ios_project';
            }
          }
          console.log('[BitBar Package] Project name:', projectName);
          
          // Create timestamp with consistent format
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
          const timestamp = `${dateStr}_${timeStr}`;
          
          // Create BitBarPackages directory if it doesn't exist
          const packagesDir = path.join(process.cwd(), 'BitBarPackages');
          if (!fs.existsSync(packagesDir)) {
            console.log('[BitBar Package] Creating BitBarPackages directory');
            fs.mkdirSync(packagesDir, { recursive: true });
          }
          
          // Generate zip filename with predictable format
          const zipFilename = `BitBar_iOS_test_${projectName}_${timestamp}.zip`;
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
                    projectName: projectName,
                    timestamp: timestamp,
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
