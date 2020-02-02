const express = require("express");
const app = express();
const port = process.env.PORT || 5000
const cors = require("cors");
const student = require("./student");


require('events').EventEmitter.prototype._maxListeners = 100;

app.use(cors());
app.use(express.json());

app.post("/", (req, res) => {
  student.loginStudent(req, res);
});

app.get("/", (req, res) => {
  res.send("Howdy, you cant see me :3")
})

app.listen(port, () => console.log(`Example app listening on port ${port}`));
