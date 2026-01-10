import dotenv from "dotenv";
import app from "./app.js";
import connDB from "./db/conn.js";
dotenv.config({
  path: "./.env",
});
connDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error while conecting", err);
  });
