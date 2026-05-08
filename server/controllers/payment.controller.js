import Payment from "../models/payment.model.js";
import User from "../models/user_model.js";
import { getVNPayClient } from "../services/vnpay.service.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  let ip =
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "127.0.0.1";

  // Convert IPv6 localhost to IPv4
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }

  return ip;
};

const buildRedirectUrl = (payment, status, message) => {
  const query = new URLSearchParams({
    payment: status,
    message,
    planId: payment.planId || "",
    txnRef: payment.orderId || "",
  });

  return `${CLIENT_URL}/pricing?${query.toString()}`;
};

const finalizePayment = async (payment, transactionId) => {
  if (payment.status === "paid") {
    return User.findById(payment.userId);
  }

  payment.status = "paid";
  payment.paymentId = transactionId || payment.paymentId;
  await payment.save();

  return User.findByIdAndUpdate(
    payment.userId,
    { $inc: { credits: payment.credits } },
    { new: true },
  );
};

export const createOrder = async (req, res) => {
  try {
    const vnpay = getVNPayClient();

    if (!vnpay) {
      return res.status(500).json({
        message:
          "VNPay is not configured. Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET in server/.env",
      });
    }

    const { planId, amount, credits } = req.body;
    const orderAmount = Number(amount); // VNPay library handles * 100 internally
    const orderCredits = Number(credits);

    if (
      !planId ||
      !orderCredits ||
      !Number.isInteger(orderAmount) ||
      orderAmount <= 0
    ) {
      return res.status(400).json({ message: "Invalid plan Data" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orderId = `VNPAY_${Date.now()}_${req.userId}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const payment = await Payment.create({
      userId: req.userId,
      planId,
      amount: orderAmount,
      credits: orderCredits,
      orderId,
      status: "created",
    });

    // Format dates for VNPay (yyyyMMddHHmmss)
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      return `${y}${m}${day}${h}${min}${s}`;
    };

    const expireDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Build payment URL - let VNPay library handle everything
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: orderAmount,
      vnp_IpAddr: getClientIp(req),
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan goi ${planId}`,
      vnp_OrderType: "mystore",
      vnp_ReturnUrl: `${SERVER_URL}/api/payment/return`,
      vnp_CreateDate: formatDate(new Date()),
      vnp_ExpireDate: formatDate(expireDate),
    });

    console.log("[VNPay] Payment URL created:", paymentUrl);

    return res.json({
      paymentUrl,
      paymentId: payment._id,
      txnRef: orderId,
    });
  } catch (error) {
    console.error("[VNPay] createOrder error:", error);
    return res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const vnpay = getVNPayClient();

    if (!vnpay) {
      return res.redirect(
        `${CLIENT_URL}/pricing?payment=failed&message=${encodeURIComponent("VNPay is not configured")}`,
      );
    }

    console.log("[VNPay] Verify return URL:", req.url);

    // Verify signature from VNPay
    const verification = vnpay.verifyReturnUrl(req.query);

    if (!verification.isVerified) {
      console.log("[VNPay] Signature verification failed");
      return res.redirect(
        `${CLIENT_URL}/pricing?payment=failed&message=${encodeURIComponent("Chữ ký không hợp lệ")}`,
      );
    }

    const txnRef = String(req.query.vnp_TxnRef || "");
    const payment = await Payment.findOne({ orderId: txnRef });

    if (!payment) {
      console.log("[VNPay] Payment record not found:", txnRef);
      return res.redirect(
        `${CLIENT_URL}/pricing?payment=failed&message=${encodeURIComponent("Payment record not found")}`,
      );
    }

    // Check if transaction is successful
    if (req.query.vnp_ResponseCode !== "00") {
      console.log(
        "[VNPay] Transaction failed with code:",
        req.query.vnp_ResponseCode,
      );
      payment.status = "failed";
      await payment.save();
      return res.redirect(
        `${CLIENT_URL}/pricing?payment=failed&message=${encodeURIComponent("Giao dịch không thành công")}`,
      );
    }

    // Update payment
    const transactionId = String(
      req.query.vnp_TransactionNo || req.query.vnp_BankTranNo || txnRef,
    );
    await finalizePayment(payment, transactionId);

    console.log("[VNPay] Payment successful:", txnRef);
    return res.redirect(
      buildRedirectUrl(payment, "success", "Thanh toan VNPay thanh cong"),
    );
  } catch (error) {
    console.error("[VNPay] Verify payment error:", error);
    return res.redirect(
      `${CLIENT_URL}/pricing?payment=failed&message=${encodeURIComponent(error.message)}`,
    );
  }
};

// IPN (Instant Payment Notification) - Server-to-server callback from VNPay
export const handleIPN = async (req, res) => {
  try {
    const vnpay = getVNPayClient();

    if (!vnpay) {
      return res.json({ RspCode: "97", Message: "VNPay is not configured" });
    }

    console.log("[VNPay] IPN received");

    // Verify signature
    const queryData = req.body || req.query;
    const verification = vnpay.verifyReturnUrl(queryData);

    if (!verification.isVerified) {
      console.log("[VNPay] IPN signature verification failed");
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }

    const txnRef = String(queryData.vnp_TxnRef || "");
    const payment = await Payment.findOne({ orderId: txnRef });

    if (!payment) {
      console.log("[VNPay] IPN payment not found:", txnRef);
      return res.json({ RspCode: "01", Message: "Order not found" });
    }

    // Check transaction response code
    if (queryData.vnp_ResponseCode !== "00") {
      console.log(
        "[VNPay] IPN transaction failed:",
        queryData.vnp_ResponseCode,
      );
      payment.status = "failed";
      await payment.save();
      return res.json({ RspCode: "00", Message: "Captured" });
    }

    // Update payment if not already paid
    if (payment.status !== "paid") {
      const transactionId = String(
        queryData.vnp_TransactionNo || queryData.vnp_BankTranNo || txnRef,
      );
      await finalizePayment(payment, transactionId);
      console.log("[VNPay] IPN payment finalized:", txnRef);
    }

    return res.json({ RspCode: "00", Message: "Confirmed" });
  } catch (error) {
    console.error("[VNPay] IPN error:", error);
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
};
