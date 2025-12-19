import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
const connDB = async () => {
  try {
    console.log(`trying to connect db`);
    await mongoose.connect(`${process.env.DB_URI_PROD}/${DB_NAME}`);
    console.log(`DB Connected`);
  } catch (error) {
    console.error("Error! while connecting to DB", error);
    process.exit(1);
  }
};
export default connDB;
