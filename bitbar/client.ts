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
  content: string; // base64 encoded content
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
    "Content-Type": string;
    "User-Agent": string;
  };
  private baseUrl = "https://cloud.bitbar.com/api";

  constructor(apiKey: string) {
    // BitBar uses Basic Auth with API key as username and empty password
    const encoded = Buffer.from(`${apiKey}:`).toString('base64');
    this.headers = {
      "Authorization": `Basic ${encoded}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
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
    const response = await fetch(`${this.baseUrl}/devices`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
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
      headers: this.headers,
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
      "List all available BitBar devices",
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
