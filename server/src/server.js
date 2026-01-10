import app from "./app.js";
import connDB from "./db/conn.js";
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

connDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log("Running in:", envFile);
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error while conecting", err);
  });
