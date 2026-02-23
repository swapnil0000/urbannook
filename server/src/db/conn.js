import mongoose from "mongoose";
import env from "../config/envConfigSetup.js";
const connDB = async () => {
  mongoose.connection.on("error", (err) => {
    console.error(`[ERROR] MongoDB connection error:`, err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.log(`[WARN] MongoDB disconnected. Attempting to reconnect...`);
  });

  try {
    console.log(`[INFO] Attempting to connect to database`);
    await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });

    console.log(`${env.NODE_ENV} Database connected successfully`);
  } catch (error) {
    console.error(
      `[CRITICAL] Initial MongoDB Connection Failed:`,
      error.message,
    );
    process.exit(1);
  }
};
export default connDB;
