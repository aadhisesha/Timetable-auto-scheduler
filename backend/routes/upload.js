const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Data = require("../models/Data");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Save to MongoDB
    await Data.insertMany(data);
    res.status(200).json({ message: "Excel data saved to MongoDB" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
