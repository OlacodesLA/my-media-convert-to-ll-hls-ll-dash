// Database Connection Test Script (Prisma)
const { PrismaClient, Prisma } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");
  console.log("📊 Database Configuration:");
  console.log(
    `   DATABASE_URL: ${process.env.DATABASE_URL ? "[SET]" : "[MISSING]"}`
  );
  console.log("");

  try {
    await prisma.$connect();
    console.log("✅ Prisma connected to the database successfully!");

    const tables = await prisma.$queryRaw(
      Prisma.sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
        ORDER BY tablename
      `
    );
    console.log("📋 Tables found:");

    if (!tables || tables.length === 0) {
      console.log(
        "   ⚠️  No tables found. You need to run the Prisma migration."
      );
      console.log("   📁 Run: npm run prisma:deploy");
    } else {
      tables.forEach((row) => {
        console.log(`   ✅ ${row.tablename}`);
      });
    }

    try {
      const userCount = await prisma.user.count();
      console.log(`👥 Users in database: ${userCount}`);
    } catch (error) {
      console.log("⚠️  Users table not found or not accessible");
    }

    await prisma.$disconnect();
    console.log("");
    console.log("🎉 Database test completed successfully!");
    console.log("🚀 Your database is ready for the social media platform!");
  } catch (error) {
    console.log("❌ Database connection failed!");
    console.log("🔧 Error details:", error.message);
    console.log("");
    console.log("📋 Troubleshooting steps:");
    console.log("1. Make sure PostgreSQL is running");
    console.log("2. Check DATABASE_URL in your .env file");
    console.log('3. Verify database "social_platform" exists');
    console.log("4. Run: npm run prisma:deploy");
    process.exit(1);
  }
}

testDatabaseConnection();
