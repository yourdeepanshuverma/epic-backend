import asyncHandler from "../utils/asyncHandler.js";
import Vendor from "../models/Vendor.js";
import SuccessResponse from "../utils/SuccessResponse.js";

export const migrateVendorCredits = asyncHandler(async (req, res) => {
  const isAdmin = req.vendor && req.vendor.role === "admin";

  if (!isAdmin) {
    return next(new ErrorResponse(403, "Access denied. Admins only."));
  }
  const vendors = await Vendor.find();
  let updatedCount = 0;

  for (const vendor of vendors) {
    // Check if leadCredits is an object (it might come as undefined if schema is strict Number, 
    // but we can access the raw document or check if it's 0 and we suspect old data)
    
    // Actually, since we updated the Schema to Number, Mongoose might strip the old object data when finding.
    // We need to use `lean()` or check `_doc` if possible, OR rely on the fact that we haven't overwritten it yet.
    
    // A safer way for this specific migration in Mongoose when schema changed:
    // We can use `Vendor.collection.find()` to bypass Mongoose schema casting.
    
    // However, for simplicity here, we'll try to rely on the lazy migration logic I added to controllers.
    // BUT, a forced migration is better.
    
    const rawVendor = await Vendor.collection.findOne({ _id: vendor._id });
    
    if (rawVendor.leadCredits && typeof rawVendor.leadCredits === 'object') {
        const standard = rawVendor.leadCredits.standard || 0;
        const premium = rawVendor.leadCredits.premium || 0;
        const elite = rawVendor.leadCredits.elite || 0;
        
        const newCredits = (standard * 10) + (premium * 25) + (elite * 50);
        
        await Vendor.updateOne(
            { _id: vendor._id }, 
            { $set: { leadCredits: newCredits } }
        );
        updatedCount++;
    }
  }

  res.status(200).json(new SuccessResponse(200, `Migration complete. Updated ${updatedCount} vendors.`));
});
