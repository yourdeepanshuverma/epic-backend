import dotenv from "@dotenvx/dotenvx";
import mongoose from "mongoose";
import Vendor from "./models/Vendor.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const runMigration = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
    console.log("Connected.");

    const vendors = await Vendor.find();
    let updatedCount = 0;

    console.log(`Checking ${vendors.length} vendors...`);

    for (const vendor of vendors) {
      // Use raw collection to access old object structure before casting
      const rawVendor = await mongoose.connection.db.collection("vendors").findOne({ _id: vendor._id });
      
      if (rawVendor.leadCredits && typeof rawVendor.leadCredits === 'object') {
        const standard = rawVendor.leadCredits.standard || 0;
        const premium = rawVendor.leadCredits.premium || 0;
        const elite = rawVendor.leadCredits.elite || 0;
        
        // Formula: Std=10, Prem=25, Elite=50
        const newCredits = (standard * 10) + (premium * 25) + (elite * 50);
        
        console.log(`Migrating ${vendor.vendorName}: {S:${standard}, P:${premium}, E:${elite}} -> ${newCredits} Credits`);

        await mongoose.connection.db.collection("vendors").updateOne(
          { _id: vendor._id },
          { $set: { leadCredits: newCredits } }
        );
        updatedCount++;
      }
    }

    console.log(`
Migration Success! Updated ${updatedCount} vendors.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration Failed:", error);
    process.exit(1);
  }
};

runMigration();
