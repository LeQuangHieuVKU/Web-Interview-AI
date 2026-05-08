import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { motion } from "motion/react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ServerUrl } from "../config";

function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const MotionDiv = motion.div;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const message = params.get("message");

    if (!paymentStatus) {
      return;
    }

    if (paymentStatus === "success") {
      alert(message || "Thanh toán thành công. Credits đã được cập nhật.");
    } else if (paymentStatus === "failed") {
      alert(message || "Thanh toán thất bại. Vui lòng thử lại.");
    }

    navigate("/pricing", { replace: true });
  }, [location.search, navigate]);

  const plans = [
    {
      id: "free",
      name: "Free Plan",
      price: "0đ",
      amount: 0,
      credits: "100",
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Reports",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "99,000đ",
      amount: 99000,
      credits: "150",
      description: "Great for focused practice and skill development.",
      features: [
        "150 AI Interview Credits",
        "Detailed Performance Analytics",
        "Performance Analytics",
        "Full Interview History",
      ],
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "199,000đ",
      amount: 199000,
      credits: "650",
      description: "Best value for serious job preparation.",
      features: [
        "650 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
  ];

  const handlePayment = async (plan) => {
    try {
      setLoadingPlan(plan.id);

      const result = await axios.post(
        ServerUrl + "/api/payment/order",
        {
          planId: plan.id,
          amount: plan.amount,
          credits: plan.credits,
        },
        { withCredentials: true },
      );

      if (!result.data?.paymentUrl) {
        throw new Error("Không nhận được URL thanh toán VNPay");
      }

      window.location.href = result.data.paymentUrl;
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Payment failed. Please try again.",
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-5 py-16 px-6">
      <div className="max-w-6xl mx-auto mb-14 flex items-start gap-4">
        <button
          onClick={() => navigate("/")}
          className="mt-2 p-3 rounded-full bg-white shadow hover:shadow-md transition"
        >
          <FaArrowLeft className="text-gray-600" />
        </button>

        <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-gray-800">Choose Your Plan</h1>
          <p className="text-gray-500 mt-3 text-lg">
            Flexiable pricing to match your interview preparation goals.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <MotionDiv
              key={plan.id}
              whileHover={!plan.default && { scale: 1.03 }}
              onClick={() => !plan.default && setSelectedPlan(plan.id)}
              className={`relative rounded-3xl p-8 transition-all duration-300 border 
                ${isSelected ? "border-emerald-600 shadow-2xl bg-white" : "border-gray-200 bg-white shadow-md"} 
                ${plan.default ? "cursor-default" : "cursor-pointer"}`}
            >
              {plan.badge && (
                <div className="absolute top-6 right-6 bg-emerald-600 text-white text-xs px-4 py-1 rounded-full shaodw">
                  {plan.badge}
                </div>
              )}

              {plan.default && (
                <div className="absolute top-6 right-6 bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">
                  Default
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-800">
                {plan.name}
              </h3>

              <div className="mt-4">
                <span className="text-3xl font-bold text-emerald-600">
                  {plan.price}
                </span>
                <p className="text-gray-500 mt-1">{plan.credits} Credits</p>
              </div>

              <p className="text-gray-500 mt-4 text-sm leading-relaxed">
                {plan.description}
              </p>

              <div className="mt-6 space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-500 text-sm" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {!plan.default && (
                <button
                  disabled={loadingPlan === plan.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelected) {
                      setSelectedPlan(plan.id);
                    } else {
                      handlePayment(plan);
                    }
                  }}
                  className={`w-full mt-8 py-3 rounded-xl font-semibold transition 
                ${isSelected ? "bg-emerald-600 text-white hover:opacity-90" : "bg-gray-100 text-gray-700 hover:bg-emerald-50"}`}
                >
                  {loadingPlan === plan.id
                    ? "Processing..."
                    : isSelected
                      ? "Proceed to Pay"
                      : "Select Plan"}
                </button>
              )}
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
}

export default Pricing;
