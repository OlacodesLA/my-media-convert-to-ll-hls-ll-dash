#!/usr/bin/env node

// Test script for UltraFast Social Platform
// This script tests the basic functionality of the platform

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testDatabase() {
  console.log("🗄️  Testing database connection...");

  try {
    await prisma.$connect();

    // Test basic query
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Users count: ${userCount}`);

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    await prisma.$disconnect().catch(() => {});
    return false;
  }
}

async function testEnvironment() {
  console.log("🔧 Testing environment variables...");

  const requiredVars = ["DATABASE_URL"];

  const optionalVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
    "MEDIACONVERT_ENDPOINT",
  ];

  let allGood = true;

  // Check required vars
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.log(`⚠️  Required environment variable ${varName} is not set`);
      allGood = false;
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
  }

  // Check optional vars
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      console.log(
        `⚠️  Optional environment variable ${varName} is not set (AWS features will be limited)`
      );
    } else {
      console.log(`✅ ${varName}: ${process.env[varName].substring(0, 10)}...`);
    }
  }

  return allGood;
}

async function testFileStructure() {
  console.log("📁 Testing file structure...");

  const requiredFiles = [
    "package.json",
    "server.js",
    "database/schema.sql",
    "public/index.html",
    "public/js/streaming-player.js",
  ];

  let allGood = true;

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allGood = false;
    }
  }

  return allGood;
}

async function testDependencies() {
  console.log("📦 Testing dependencies...");

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const dependencies = Object.keys(packageJson.dependencies || {});

    console.log(`✅ Found ${dependencies.length} dependencies in package.json`);

    // Check if node_modules exists
    if (fs.existsSync("node_modules")) {
      console.log("✅ node_modules directory exists");
      return true;
    } else {
      console.log('⚠️  node_modules not found. Run "npm install" first.');
      return false;
    }
  } catch (error) {
    console.error("❌ Error reading package.json:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 UltraFast Social Platform - System Test\n");

  const tests = [
    { name: "File Structure", fn: testFileStructure },
    { name: "Dependencies", fn: testDependencies },
    { name: "Environment Variables", fn: testEnvironment },
    { name: "Database Connection", fn: testDatabase },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }

  console.log("\n📊 Test Results Summary:");
  console.log("========================");

  let passedCount = 0;
  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.name}`);
    if (result.passed) passedCount++;
  }

  console.log(`\n🎯 Overall: ${passedCount}/${results.length} tests passed`);

  if (passedCount === results.length) {
    console.log(
      "\n🎉 All tests passed! Your UltraFast Social Platform is ready to go!"
    );
    console.log('🚀 Run "npm run dev" to start the development server');
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please check the issues above before starting the server."
    );
  }
}

// Load environment variables
require("dotenv").config();

// Run tests
runTests().catch(console.error);





