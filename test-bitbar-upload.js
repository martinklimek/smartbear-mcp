#!/usr/bin/env node

// Test script for BitBar file upload functionality
import { BitBarClient } from "./dist/bitbar/client.js";
import fs from 'fs';

const BITBAR_API_KEY = 'LDbgqQKWFfpRoiC91fQxebvA2aEgcfwh';

async function testBitBarUpload() {
  console.log('🧪 Testing BitBar File Upload Functionality...\n');

  try {
    // Initialize BitBar client
    const client = new BitBarClient(BITBAR_API_KEY);
    console.log('✅ BitBar client initialized');

    // Test 1: Get user info to verify API key works
    console.log('\n📋 Test 1: Verifying API connection...');
    try {
      const user = await client.getUser();
      console.log('✅ API connection successful');
      console.log(`👤 User: ${user.email || 'Unknown'}`);
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return;
    }

    // Test 2: List existing files
    console.log('\n📋 Test 2: Listing existing files...');
    try {
      const files = await client.listFiles();
      console.log(`✅ Found ${files.data?.length || 0} existing files`);
    } catch (error) {
      console.error('❌ Failed to list files:', error.message);
    }

    // Test 3: Create a small test file and upload it
    console.log('\n📋 Test 3: Testing file upload...');
    
    // Create a small test text file
    const testFileContent = `# BitBar Test File
This is a test file uploaded via MCP.
Timestamp: ${new Date().toISOString()}
API Test: Success
`;
    
    // Convert to base64
    const base64Content = Buffer.from(testFileContent, 'utf8').toString('base64');
    
    console.log(`📄 Test file created (${testFileContent.length} bytes)`);
    console.log(`🔐 Base64 encoded (${base64Content.length} chars)`);

    try {
      const uploadResult = await client.uploadFile({
        filename: 'mcp-test-file.txt',
        fileContent: base64Content,
        contentType: 'text/plain'
      });
      
      console.log('✅ File upload successful!');
      console.log(`📁 File ID: ${uploadResult.id}`);
      console.log(`📝 File Name: ${uploadResult.name}`);
      console.log(`📊 File Size: ${uploadResult.size} bytes`);
      
      return uploadResult.id;
    } catch (error) {
      console.error('❌ File upload failed:', error.message);
      if (error.message.includes('401')) {
        console.error('🔐 Authentication failed - please check your API key');
      } else if (error.message.includes('413')) {
        console.error('📁 File too large for upload');
      } else if (error.message.includes('415')) {
        console.error('🚫 File type not supported');
      }
      throw error;
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    process.exit(1);
  }
}

// Test 4: If upload succeeded, try to download and verify
async function testDownload(fileId) {
  if (!fileId) return;
  
  console.log('\n📋 Test 4: Testing file download...');
  
  try {
    const client = new BitBarClient(BITBAR_API_KEY);
    const blob = await client.downloadFile(fileId);
    const arrayBuffer = await blob.arrayBuffer();
    const downloadedContent = Buffer.from(arrayBuffer).toString('utf8');
    
    console.log('✅ File download successful!');
    console.log(`📄 Downloaded content preview:`);
    console.log(downloadedContent.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ File download failed:', error.message);
  }
}

// Run the tests
testBitBarUpload()
  .then(testDownload)
  .then(() => {
    console.log('\n🎉 All tests completed!');
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  });
