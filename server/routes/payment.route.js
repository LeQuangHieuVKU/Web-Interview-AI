import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  createOrder,
  verifyPayment,
  handleIPN,
} from "../controllers/payment.controller.js";
const paymentRouter = express.Router();

paymentRouter.post("/order", isAuth, createOrder);
paymentRouter.get("/return", verifyPayment);
paymentRouter.get("/verify", verifyPayment);
paymentRouter.post("/ipn", handleIPN); // IPN callback from VNPay

export default paymentRouter;
