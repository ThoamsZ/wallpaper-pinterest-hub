import { DollarSign, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PLAN_PRICES = {
  monthly: { amount: 4.99, currency: "USD" },
  yearly: { amount: 39.99, currency: "USD" },
  lifetime: { amount: 99.99, currency: "USD" },
};

const Subscription = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planIds, setPlanIds] = useState<{ [key: string]: string }>({});
  const paypalScriptRef = useRef<HTMLScriptElement | null>(null);
  const buttonContainersRef = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({
    monthly: null,
    yearly: null,
    lifetime: null,
  });

  useEffect(() => {
    const loadPaypalScript = async () => {
      try {
        console.log("Fetching PayPal credentials and plan IDs...");

        // Fetch PayPal client ID
        const { data: secretData, error: secretError } = await supabase
          .from("secrets")
          .select("value")
          .eq("name", "PAYPAL_CLIENT_ID")
          .maybeSingle();

        if (secretError || !secretData?.value) {
          console.error("Error loading PayPal client ID:", secretError);
          setLoadError(
            "Failed to load payment system. Please try again later."
          );
          return;
        }

        // Fetch plan IDs
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("type, paypal_plan_id");

        if (plansError) {
          console.error("Error loading plan IDs:", plansError);
          setLoadError(
            "Failed to load subscription plans. Please try again later."
          );
          return;
        }

        const planIdMap = plansData.reduce(
          (acc: { [key: string]: string }, plan) => {
            acc[plan.type] = plan.paypal_plan_id;
            return acc;
          },
          {}
        );

        setPlanIds(planIdMap);
        console.log("Plan IDs loaded:", planIdMap);

        // Load PayPal SDK if not already loaded
        if (!window.paypal) {
          const script = document.createElement("script");
          script.src = `https://www.paypal.com/sdk/js?client-id=${secretData.value}&vault=true&intent=subscription&components=buttons`;
          script.async = true;
          script.onload = () => {
            console.log("PayPal SDK loaded successfully");
            setPaypalLoaded(true);
            setLoadError(null);
          };
          script.onerror = (e) => {
            console.error("Failed to load PayPal SDK:", e);
            setLoadError(
              "Failed to load payment system. Please try again later."
            );
          };

          paypalScriptRef.current = script;
          document.body.appendChild(script);
        } else {
          console.log("PayPal SDK already loaded");
          setPaypalLoaded(true);
        }
      } catch (error) {
        console.error("Error initializing PayPal:", error);
        setLoadError("Failed to initialize payment system. Please try again later.");
      }
    };

    loadPaypalScript();
  }, []);

  const handleSubscribe = async (plan: string) => {
    if (!session || session.user.email === "guest@wallpaperhub.com") {
      toast({
        title: "Authentication Required",
        description: "Please register or login to subscribe.",
      });
      navigate("/auth");
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      const planDetails = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];

      // Create subscription record
      const { data: subscription, error: dbError } = await supabase
        .from("paypal_subscriptions")
        .insert({
          user_id: session.user.id,
          subscription_type: plan,
          amount: planDetails.amount,
          currency: planDetails.currency,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      console.log("Created subscription record:", subscription);

      // Clear existing PayPal buttons
      const container = buttonContainersRef.current[plan];
      if (container) {
        container.innerHTML = "";
      }

      if (window.paypal) {
        console.log("Initializing PayPal buttons for plan:", plan);

        // Common button configuration
        const commonConfig = {
          style: {
            shape: "rect",
            color: "blue",
            layout: "vertical",
            label: "subscribe",
          },
          onApprove: async (data: any, actions: any) => {
            console.log("Payment approved:", data);

            try {
              const { error: updateError } = await supabase
                .from("paypal_subscriptions")
                .update({
                  status: "completed",
                  paypal_subscription_id: data.subscriptionID || null,
                  paypal_order_id: data.orderID || null,
                })
                .eq("id", subscription.id);

              if (updateError) {
                console.error("Error updating subscription:", updateError);
                throw new Error("Subscription update failed in database");
              }

              toast({
                title: "Success!",
                description: "Your subscription has been activated.",
              });

              window.location.reload();
            } catch (error) {
              console.error("Failed to finalize subscription:", error);
              toast({
                title: "Payment Error",
                description:
                  "Your payment was approved but the system encountered an issue. Contact
::contentReference[oaicite:0]{index=0}
 
