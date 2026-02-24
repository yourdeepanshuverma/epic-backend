import mongoose from "mongoose";
import dns from "dns";  // ← Add this

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const connectDB = async () => {
  try {

    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}?retryWrites=true&w=majority&authSource=admin`
    );
    console.log(
      `\nMongoDB Connected || DB NAME: ${process.env.DB_NAME} || DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB Connection FAILED:", error);
  }
};

export default connectDB;
