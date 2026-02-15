import "./config/envConfigSetup.js";
import app from "./app.js";
import connDB from "./db/conn.js";

connDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`✅ Server is running at port : ${process.env.PORT}`);
      console.log(`Running in mode: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.log("Error while connecting", err);
  });
