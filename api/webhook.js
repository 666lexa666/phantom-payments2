import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// 🔑 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", async (req, res) => {
  try {
    console.log("📥 Webhook received at", new Date().toISOString());
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    const { id, status } = req.body;

    // Проверка наличия id и status
    if (!id || !status) {
      console.warn("⚠️ Missing id or status", { id, status });
      return res.status(400).json({ error: "Missing id or status" });
    }

    // 🔍 Ищем запись в purchases2
    console.log(`🔍 Searching purchase with id: ${id}`);
    const { data: purchase, error: selectErr } = await supabase
      .from("purchases2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (selectErr) {
      console.error("❌ Error selecting purchase:", selectErr);
      throw selectErr;
    }

    if (!purchase) {
      console.warn("⚠️ Purchase not found for id:", id);
      return res.status(404).json({ error: "Purchase not found" });
    }

    console.log("✅ Purchase found:", purchase);

    // ⚙️ Определяем новый статус
    let newStatus;
    if (status === "Settlement") {
      newStatus = "success";
    } else if (status === "Failed" || status === "Expired") {
      newStatus = "cancelled";
    } else {
      console.warn("⚠️ Invalid status value received:", status);
      return res.status(400).json({ error: "Invalid status value" });
    }

    console.log(`⚙️ Updating status to: ${newStatus}`);

    // 🔄 Обновляем запись
    const { data: updatedPurchase, error: updateErr } = await supabase
      .from("purchases2")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("❌ Error updating purchase:", updateErr);
      throw updateErr;
    }

    console.log("✅ Purchase updated:", updatedPurchase);

    return res.status(200).json({
      message: "Purchase status updated",
      id,
      newStatus,
      updatedPurchase,
    });
  } catch (err) {
    console.error("❌ Ошибка webhook:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
