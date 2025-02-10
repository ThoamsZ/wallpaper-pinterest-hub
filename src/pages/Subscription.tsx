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

        console.log("Fetched plans data:", plansData);

        if (!plansData || plansData.length === 0) {
          console.error("No plan IDs found in database");
          setLoadError("Subscription plans are not configured. Please try again later.");
          return;
        }

        const planIdMap = plansData.reduce(
          (acc: { [key: string]: string }, plan) => {
            acc[plan.type] = plan.paypal_plan_id;
            return acc;
          },
          {}
        );

        // Validate that we have all required plan IDs
        const requiredPlans = ['monthly', 'yearly'];
        const missingPlans = requiredPlans.filter(
          planType => !planIdMap[planType] || planIdMap[planType] === 'P-PLACEHOLDER'
        );

        if (missingPlans.length > 0) {
          console.error("Missing or invalid plan IDs for:", missingPlans);
          setLoadError("Some subscription plans are not properly configured. Please try again later.");
          return;
        }

        setPlanIds(planIdMap);
        console.log("Plan IDs loaded successfully:", planIdMap);

        // Load PayPal SDK
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
                  "Your payment was approved but we encountered an issue. Please contact support.",
              });
            }
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            toast({
              title: "Payment Error",
              description: "Failed to process payment. Please try again later.",
            });
            setIsProcessing(false);
          },
        };

        // Create buttons based on plan type
        let buttonConfig;
        if (plan === "lifetime") {
          buttonConfig = {
            ...commonConfig,
            createOrder: async (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      currency_code: planDetails.currency,
                      value: planDetails.amount.toString(),
                    },
                  },
                ],
              });
            },
          };
        } else {
          const planId = planIds[plan];
          
          // Additional validation before creating subscription
          if (!planId || planId === 'P-PLACEHOLDER') {
            console.error(`Invalid plan ID for ${plan} subscription:`, planId);
            toast({
              title: "Configuration Error",
              description: "This subscription plan is not properly configured. Please try again later.",
            });
            setIsProcessing(false);
            return;
          }

          console.log(`Creating subscription for plan ${plan} with ID:`, planId);
          
          buttonConfig = {
            ...commonConfig,
            createSubscription: async (data: any, actions: any) => {
              return actions.subscription.create({
                plan_id: planId,
              });
            },
          };
        }

        const Buttons = window.paypal.Buttons(buttonConfig);

        if (container && (await Buttons.isEligible())) {
          Buttons.render(container);
        } else {
          console.error("PayPal Buttons not eligible for rendering");
          setLoadError("Payment option not available. Please try again later.");
        }
      }
    } catch (error) {
      console.error("Error in handleSubscribe:", error);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again later.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="flex justify-center items-center h-screen">
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Subscribe</CardTitle>
              <CardDescription>
                Choose a subscription plan to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Monthly</CardTitle>
                  <Button
                    onClick={() => handleSubscribe("monthly")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Subscribe"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle>Yearly</CardTitle>
                  <Button
                    onClick={() => handleSubscribe("yearly")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Subscribe"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle>Lifetime</CardTitle>
                  <Button
                    onClick={() => handleSubscribe("lifetime")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Subscribe"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
