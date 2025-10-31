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
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: "Missing id or status" });
    }

    // 🔍 Ищем запись в purchases2
    const { data: purchase, error: selectErr } = await supabase
      .from("purchases2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (selectErr) throw selectErr;
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // ⚙️ Определяем новый статус
    let newStatus;
    if (status === "Settlement") {
      newStatus = "success";
    } else if (status === "Failed" || status === "Expired") {
      newStatus = "cancelled";
    } else {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // 🔄 Обновляем запись
    const { error: updateErr } = await supabase
      .from("purchases2")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return res.status(200).json({ message: "Purchase status updated", id, newStatus });
  } catch (err) {
    console.error("❌ Ошибка webhook:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
