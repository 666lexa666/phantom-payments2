import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { generateCustomerEmail } from "../../utils/emailGenerator.js";

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", async (req, res) => {
  try {
    const { sum, client_id } = req.body;

    if (!sum || !client_id) {
      return res.status(400).json({ error: "Missing sum or client_id" });
    }

    let apiKey = req.headers["x-api-key"];
    let apiLogin = req.headers["x-api-login"];

    if (!apiKey && !apiLogin) {
      return res.status(400).json({ error: "Missing API credentials" });
    }

    // Если есть только apiKey — ищем apiLogin
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

    // Работа с clients2
    const { data: clientData } = await supabase
      .from("clients2")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    const totalAmount = sum / 100;

    if (!clientData) {
      const { error: insertErr } = await supabase.from("clients2").insert([
        {
          client_id,
          api_login: apiLogin,
          total_amount: totalAmount,
        },
      ]);
      if (insertErr) throw insertErr;
    } else {
      const { error: updateErr } = await supabase
        .from("clients2")
        .update({ total_amount: clientData.total_amount + totalAmount })
        .eq("client_id", client_id);

      if (updateErr) throw updateErr;
    }

    // ============================
    // Генерация email (1 запрос = 1 email)
    // ============================
    const customerEmail = generateCustomerEmail();

    // ============================
    // Формируем payload для BIRS
    // ============================
    const birsPayload = {
      amount: totalAmount,
      customer_email: customerEmail,
      callback_url: "https://phantom-payments2.onrender.com/api/webhook",
    };

    // 🔍 ЛОГ ЗАПРОСА В BIRS
    console.log("➡️ BIRS request payload:", birsPayload);

    // ============================
    // Запрос к BIRS
    // ============================
    const birsResponse = await fetch(
      "https://example.com",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": process.env.BIRS_API_KEY,
        },
        body: JSON.stringify(birsPayload),
      }
    );

    const birsData = await birsResponse.json();

    // 🔍 ЛОГ ОТВЕТА BIRS
    console.log("⬅️ BIRS response:", birsData);

    if (!birsData.success) {
      return res.status(500).json({
        error: "BIRS API error",
        details: birsData,
      });
    }

    // ============================
    // Вставка в purchases2
    // ============================
    const qr_id = uuidv4();
    const purchaseId = birsData.data.id;

    const { error: purchaseErr } = await supabase.from("purchases2").insert([
      {
        id: purchaseId,
        user_id: null,
        amount: totalAmount,
        status: "pending",
        api_login: apiLogin,
        payer_phone: null,
        qr_id,
        qr_payload: birsData.data.payment_url,
        sndpam: null,
        client_id: client_id,
        customer_email: customerEmail, // 👈 советую сохранить
      },
    ]);

    if (purchaseErr) throw purchaseErr;

    res.json({
      results: {
        operation_id: purchaseId,
        qr_id,
        qr_link: birsData.data.payment_url,
      },
    });
  } catch (err) {
    console.error("❌ qr-code error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
