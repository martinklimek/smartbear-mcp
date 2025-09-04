// Simple test to verify BitBar client compilation
import { BitBarClient } from "./bitbar/client.js";

// Test instantiation
const client = new BitBarClient("test-api-key");

// Test method signatures
async function testMethods() {
  // File management methods
  await client.uploadFile({
    filename: "test.apk",
    fileContent: "base64content",
    contentType: "application/vnd.android.package-archive"
  });
  
  await client.downloadFile("fileId");
  await client.updateFileName("fileId", "newname.apk");
  await client.updateFileContent("fileId", {
    filename: "test.apk", 
    fileContent: "newcontent",
    contentType: "application/vnd.android.package-archive"
  });
}

console.log("BitBar client compiled successfully");
