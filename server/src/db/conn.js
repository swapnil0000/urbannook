import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connDB = async () => {
  mongoose.connection.on("error", (err) => {
    console.error(`[ERROR] MongoDB connection error:`, err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.log(`[WARN] MongoDB disconnected. Attempting to reconnect...`);
  });

  try {
    console.log(`[INFO] Attempting to connect to database`);
    
    await mongoose.connect(`${process.env.DB_URI_PROD}/${DB_NAME}`, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });
    
    console.log(`[INFO] Database connected successfully`);
  } catch (error) {
    console.error(`[CRITICAL] Initial MongoDB Connection Failed:`, error.message);
    process.exit(1); 
  }
};
export default connDB;
