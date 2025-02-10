
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SubscriptionPlanCard from "@/components/subscription/SubscriptionPlanCard";
import VIPBenefits from "@/components/subscription/VIPBenefits";

const PLAN_PRICES = {
  monthly: { amount: 4.99, currency: "USD" },
  yearly: { amount: 39.99, currency: "USD" },
  lifetime: { amount: 99.99, currency: "USD" },
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const Subscription = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planIds, setPlanIds] = useState<{[key: string]: string}>({});
  const paypalScriptRef = useRef<HTMLScriptElement | null>(null);
  const buttonContainersRef = useRef<{[key: string]: HTMLDivElement | null}>({});
  const retryCountRef = useRef(0);

  const loadPaypalScript = async () => {
    try {
      if (paypalScriptRef.current) {
        document.body.removeChild(paypalScriptRef.current);
        paypalScriptRef.current = null;
      }

      // Fetch PayPal client ID
      const { data: secretData, error: secretError } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'PAYPAL_CLIENT_ID')
        .maybeSingle();

      if (secretError || !secretData?.value) {
        throw new Error('Failed to load payment configuration');
      }

      // Fetch plan IDs
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('type, paypal_plan_id');

      if (plansError) {
        throw new Error('Failed to load subscription plans');
      }

      const planIdMap = plansData.reduce((acc: {[key: string]: string}, plan) => {
        acc[plan.type] = plan.paypal_plan_id;
        return acc;
      }, {});

      setPlanIds(planIdMap);

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${secretData.value}&vault=true&intent=subscription`;
        script.async = true;
        
        script.onload = () => {
          setPaypalLoaded(true);
          setLoadError(null);
          resolve();
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load payment system'));
        };

        paypalScriptRef.current = script;
        document.body.appendChild(script);
      });
    } catch (error) {
      throw error;
    }
  };

  const retryLoadPaypal = async () => {
    try {
      await loadPaypalScript();
      retryCountRef.current = 0;
    } catch (error) {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setTimeout(retryLoadPaypal, RETRY_DELAY);
      } else {
        setLoadError('Unable to load payment system. Please refresh the page or try again later.');
      }
    }
  };

  useEffect(() => {
    retryLoadPaypal();
    return () => {
      if (paypalScriptRef.current) {
        document.body.removeChild(paypalScriptRef.current);
      }
    };
  }, []);

  const handleSubscribe = async (plan: string) => {
    if (!session || session.user.email === 'guest@wallpaperhub.com') {
      toast({
        title: "Authentication Required",
        description: "Please register or login to subscribe.",
      });
      navigate("/auth");
      return;
    }

    if (isProcessing || !paypalLoaded) {
      return;
    }

    setIsProcessing(true);
    try {
      const planDetails = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
      
      // Create subscription record
      const { data: subscription, error: dbError } = await supabase
        .from('paypal_subscriptions')
        .insert({
          user_id: session.user.id,
          subscription_type: plan,
          amount: planDetails.amount,
          currency: planDetails.currency,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Clear existing PayPal buttons
      const container = buttonContainersRef.current[plan];
      if (container) {
        container.innerHTML = '';
      }

      // PayPal button configuration
      const buttonConfig = {
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe'
        },
        onApprove: async (data: any, actions: any) => {
          // Update subscription status
          const { error: updateError } = await supabase
            .from('paypal_subscriptions')
            .update({ 
              status: 'completed',
              paypal_subscription_id: data.subscriptionID || null,
              paypal_order_id: data.orderID || null
            })
            .eq('id', subscription.id);

          if (updateError) {
            throw updateError;
          }

          toast({
            title: "Success!",
            description: "Your subscription has been activated.",
          });

          window.location.reload();
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          toast({
            title: "Error",
            description: "There was a problem processing your payment. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Create the appropriate PayPal button based on plan type
      if (plan === 'lifetime') {
        const Buttons = window.paypal.Buttons({
          ...buttonConfig,
          createOrder: () => {
            return window.paypal.Buttons.createOrder({
              purchase_units: [{
                amount: {
                  currency_code: planDetails.currency,
                  value: planDetails.amount.toString()
                }
              }]
            });
          }
        });

        if (container && await Buttons.isEligible()) {
          await Buttons.render(container);
        }
      } else {
        const planId = planIds[plan];
        if (!planId) {
          throw new Error('This subscription plan is not available at the moment.');
        }

        const Buttons = window.paypal.Buttons({
          ...buttonConfig,
          createSubscription: () => {
            return window.paypal.Buttons.createSubscription({
              plan_id: planId
            });
          }
        });

        if (container && await Buttons.isEligible()) {
          await Buttons.render(container);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem setting up your subscription.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">💎 xxWallpaper VIP Membership</h1>
            <p className="text-gray-600">
              Enjoy 25 daily downloads, exclusive content, batch downloads, and more premium features.
              Subscribe through PayPal for automated subscription management and hassle-free downloading experience.
            </p>
            {loadError && (
              <div className="mt-4 text-red-500 bg-red-50 p-4 rounded-lg">
                {loadError}
                <button 
                  onClick={() => retryLoadPaypal()}
                  className="ml-2 underline hover:text-red-600"
                  disabled={isProcessing}
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <SubscriptionPlanCard
              title="Monthly VIP"
              description="Perfect for short-term needs"
              price={PLAN_PRICES.monthly.amount}
              interval="per month"
              planType="monthly"
              onSubscribe={handleSubscribe}
              isProcessing={isProcessing}
              loadError={loadError}
              buttonContainerRef={(el) => buttonContainersRef.current['monthly'] = el}
            />
            <SubscriptionPlanCard
              title="Yearly VIP"
              description="Save 33% with annual billing"
              price={PLAN_PRICES.yearly.amount}
              interval="per year"
              planType="yearly"
              isHighlighted={true}
              onSubscribe={handleSubscribe}
              isProcessing={isProcessing}
              loadError={loadError}
              buttonContainerRef={(el) => buttonContainersRef.current['yearly'] = el}
            />
            <SubscriptionPlanCard
              title="Lifetime VIP"
              description="One-time purchase, forever access"
              price={PLAN_PRICES.lifetime.amount}
              interval="one-time payment"
              planType="lifetime"
              onSubscribe={handleSubscribe}
              isProcessing={isProcessing}
              loadError={loadError}
              buttonContainerRef={(el) => buttonContainersRef.current['lifetime'] = el}
            />
          </div>

          <VIPBenefits />
        </div>
      </main>
    </div>
  );
};

export default Subscription;
