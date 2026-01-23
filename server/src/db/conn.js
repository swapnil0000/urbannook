import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
const connDB = async () => {
  try {
    console.log(`trying to connect db`);
    await mongoose.connect(`${process.env.DB_URI_PROD}/${DB_NAME}`, {
      maxPoolSize: 10, // max 10 concurrent connections i.e. 10 quries at a time , 11th will wait
      minPoolSize: 2, // two conn always alive
      socketTimeoutMS: 45000, // if db doesn't response in 45 sec then kill the connection
      // family: 4, // forces to use IPv4
    });
    console.log(`DB Connected`);
  } catch (error) {
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
    });
    process.exit(1);
  }
};
export default connDB;
