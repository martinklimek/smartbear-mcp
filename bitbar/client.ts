import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  }

  registerResources(_server: McpServer): void {
    // BitBar does not currently support dynamic resources in this implementation
    // Could be extended to provide resources for projects, device groups, etc.
  }
}
