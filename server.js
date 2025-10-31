import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// 📂 Импорт роутеров
import qrCodeRouter from "./api/operations/qr-code.js";
import qrStatusRouter from "./api/operations/[opId]/qr-status.js";
import webhookRouter from "./api/webhook.js";

dotenv.config();

const app = express();

// 🔹 Middleware для JSON
app.use(bodyParser.json());

// 🔹 Роуты
app.use("/api/operations/qr-code", qrCodeRouter);
app.use("/api/operations/:opId/qr-status", qrStatusRouter);
app.use("/api/webhook", webhookRouter);

// 🔹 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
