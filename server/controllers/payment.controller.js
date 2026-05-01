import razorpay from "../services/razorpay.service.js";
import Payment from "../models/payment.model.js";
import User from "../models/user_model.js";
import crypto from "crypto";
export const createOrder = async (req, res) => {
  try {
    const { planId, amount, credits } = req.body;
    const orderAmount = Number(amount);
    const orderCredits = Number(credits);

    if (
      !planId ||
      !orderCredits ||
      !Number.isFinite(orderAmount) ||
      orderAmount <= 0
    ) {
      return res.status(400).json({ message: "Invalid plan Data " });
    }

    const options = {
      amount: Math.round(orderAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await razorpay.orders.create(options);

    await Payment.create({
      userId: req.userId,
      planId,
      amount: orderAmount,
      credits: orderCredits,
      orderId: order.id,
      status: "created",
    });

    return res.json(order);
  } catch (error) {
    if (
      error?.statusCode === 401 ||
      error?.error?.code === "BAD_REQUEST_ERROR"
    ) {
      return res.status(502).json({
        message:
          "Razorpay authentication failed. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        error: error?.error?.description || error?.message,
      });
    }

    return res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ orderId: orderId });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status === "paid") {
      return res.status(400).json({ message: "Payment already verified" });
    }

    // Update payment record
    payment.status = "paid";
    payment.paymentId = paymentId;
    await payment.save();

    //Add credits to user account
    const updatedUser = await User.findByIdAndUpdate(
      payment.userId,
      { $inc: { credits: payment.credits } },
      { new: true },
    );

    res.json({
      success: true,
      message: "Payment verified successfully and credits added",
      userId: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error to create and verifying payment",
      error: error.message,
    });
  }
};
