import { VNPay } from "vnpay";

let cachedClient = null;

export const getVNPayClient = () => {
  const tmnCode = process.env.VNPAY_TMN_CODE || process.env.VNP_TMN_CODE;
  const secureSecret =
    process.env.VNPAY_HASH_SECRET || process.env.VNP_HASH_SECRET;

  if (!tmnCode || !secureSecret) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
    queryDrAndRefundHost:
      process.env.VNPAY_QUERY_HOST || "https://sandbox.vnpayment.vn",
    testMode: process.env.VNPAY_TEST_MODE !== "false",
  });

  return cachedClient;
};
