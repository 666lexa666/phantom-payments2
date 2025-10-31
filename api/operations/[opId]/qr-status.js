import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router({ mergeParams: true });

// 🔑 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", async (req, res) => {
  try {
    const opId = req.params.opId;
    let apiKey = req.headers["x-api-key"];
    let apiLogin = req.headers["x-api-login"];

    if (!apiKey && !apiLogin) {
      return res.status(400).json({ error: "Missing API credentials" });
    }

    if (!opId) {
      return res.status(400).json({ error: "Missing opId" });
    }

    // ⚙️ Если пришёл только API-ключ — ищем логин по нему
    if (!apiLogin && apiKey) {
      const { data: clientByKey, error: keyErr } = await supabase
        .from("api_clients")
        .select("api_login")
        .eq("api_key", apiKey)
        .maybeSingle();

      if (keyErr) throw keyErr;
      if (!clientByKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      apiLogin = clientByKey.api_login;
    }

    // 🔍 Проверяем корректность клиента
    const { data: client, error: clientErr } = await supabase
      .from("api_clients")
      .select("api_login")
      .eq("api_login", apiLogin)
      .eq("api_key", apiKey)
      .maybeSingle();

    if (clientErr) throw clientErr;
    if (!client) {
      return res.status(403).json({ error: "Forbidden: invalid API credentials" });
    }

    // 🔹 Всегда используем таблицу purchases2
    const tableName = "purchases2";

    // 🔍 Ищем операцию по opId
    const { data: purchase, error: purchaseErr } = await supabase
      .from(tableName)
      .select("status")
      .eq("api_login", apiLogin)
      .eq("id", opId)
      .maybeSingle();

    if (purchaseErr) throw purchaseErr;
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // ✅ Определяем статус
    let operation_status_code = 1; // по умолчанию — "ожидание"

    if (purchase.status?.toLowerCase() === "success") {
      operation_status_code = 5; // успешная операция
    } else if (purchase.status?.toLowerCase() === "refund") {
      operation_status_code = 3; // возврат
    }

    return res.status(200).json({
      results: { operation_status_code },
    });
  } catch (err) {
    console.error("❌ Ошибка проверки статуса:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
