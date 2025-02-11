import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SubscriptionPlanCard from "@/components/subscription/SubscriptionPlanCard";
import VIPBenefits from "@/components/subscription/VIPBenefits";
import { Crown, CalendarClock } from "lucide-react";
import { format } from "date-fns";

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
  const [planIds, setPlanIds] = useState<{[key: string]: string}>({});
  const paypalScriptRef = useRef<HTMLScriptElement | null>(null);
  const buttonContainersRef = useRef<{[key: string]: HTMLDivElement | null}>({});
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [vipType, setVipType] = useState<string | null>(null);
  const lifetimeButtonRef = useRef<HTMLDivElement | null>(null);
  const statusCheckInterval = useRef<number | null>(null);

  useEffect(() => {
    const fetchUserVipStatus = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('vip_expires_at, vip_type')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching VIP status:', error);
        return;
      }

      if (data) {
        setVipType(data.vip_type);
        setVipExpiresAt(data.vip_expires_at);
        setIsVip(
          data.vip_type === 'lifetime' || 
          (data.vip_type && data.vip_expires_at && new Date(data.vip_expires_at) > new Date())
        );
      }
    };

    fetchUserVipStatus();
  }, [session]);

  useEffect(() => {
    const loadPaypalScript = async () => {
      try {
        console.log('Starting PayPal script loading process...');
        
        // Fetch PayPal client ID
        const { data: secretData, error: secretError } = await supabase
          .from('secrets')
          .select('value')
          .eq('name', 'PAYPAL_CLIENT_ID')
          .maybeSingle();

        if (secretError) {
          console.error('Error loading PayPal client ID:', secretError);
          setLoadError('Failed to load payment system. Please try again later.');
          return;
        }

        if (!secretData?.value) {
          console.error('PayPal client ID not found');
          setLoadError('Payment system configuration is incomplete. Please try again later.');
          return;
        }

        console.log('PayPal client ID loaded successfully');

        // Fetch plan IDs
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('type, paypal_plan_id');

        if (plansError) {
          console.error('Error loading plan IDs:', plansError);
          setLoadError('Failed to load subscription plans. Please try again later.');
          return;
        }

        if (!plansData || plansData.length === 0) {
          console.error('No plans found in database');
          setLoadError('Subscription plans are not available at the moment. Please try again later.');
          return;
        }

        console.log('Fetched plans from database:', plansData);

        // Create a map of plan types to their PayPal plan IDs
        const planIdMap = plansData.reduce((acc: {[key: string]: string}, plan) => {
          if (plan.type && plan.paypal_plan_id) {
            acc[plan.type] = plan.paypal_plan_id;
          }
          return acc;
        }, {});

        console.log('Created plan ID map:', planIdMap);
        setPlanIds(planIdMap);

        // Remove existing PayPal script if it exists
        if (paypalScriptRef.current) {
          document.body.removeChild(paypalScriptRef.current);
        }

        // Load PayPal SDK
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${secretData.value}&vault=true&intent=subscription&components=buttons`;
        script.async = true;
        script.onload = () => {
          console.log('PayPal SDK loaded successfully');
          setPaypalLoaded(true);
          setLoadError(null);
        };
        script.onerror = (e) => {
          console.error('Failed to load PayPal SDK:', e);
          setLoadError('Failed to load payment system. Please try again later.');
        };
        
        paypalScriptRef.current = script;
        document.body.appendChild(script);

      } catch (error) {
        console.error('Error in loadPaypalScript:', error);
        setLoadError('Failed to initialize payment system. Please try again later.');
      }
    };

    loadPaypalScript();

    return () => {
      if (paypalScriptRef.current) {
        document.body.removeChild(paypalScriptRef.current);
      }
    };
  }, []);

  const checkPaymentStatus = async (paymentId: string) => {
    console.log('Checking payment status for ID:', paymentId);
    
    const { data, error } = await supabase
      .from('paypal_one_time_payments')
      .select('status')
      .eq('paypal_order_id', paymentId)
      .single();

    if (error) {
      console.error('Error checking payment status:', error);
      return;
    }

    console.log('Payment status:', data.status);

    if (data.status === 'completed') {
      // Clear the interval and reload the page
      if (statusCheckInterval.current) {
        window.clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      
      toast({
        title: "Success!",
        description: "Your lifetime subscription has been activated.",
      });
      
      window.location.reload();
    }
  };

  const handleSubscribe = async (plan: string) => {
    if (!session || session.user.email === 'guest@wallpaperhub.com') {
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

    if (!planIds[plan]) {
      console.error(`No plan ID found for plan type: ${plan}`);
      toast({
        title: "Error",
        description: "This subscription plan is not available at the moment. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting subscription process for plan:', plan);
    console.log('Available plan IDs:', planIds);
    
    setIsProcessing(true);
    try {
      const planDetails = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
      if (!planDetails) {
        throw new Error('Invalid plan type');
      }
      
      console.log('Plan details:', planDetails);
      
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
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Created subscription record:', subscription);

      // Clear existing PayPal buttons
      const container = buttonContainersRef.current[plan];
      if (container) {
        container.innerHTML = '';
      }

      if (!window.paypal) {
        console.error('PayPal SDK not loaded');
        throw new Error('PayPal SDK not loaded');
      }

      console.log('Initializing PayPal buttons for plan:', plan);
      
      // Subscription configuration
      const planId = planIds[plan];
      console.log(`Using plan ID for ${plan}:`, planId);
      
      const buttonConfig = {
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: async (data: any, actions: any) => {
          console.log(`Creating subscription with plan ID: ${planId}`);
          try {
            const result = await actions.subscription.create({
              plan_id: planId
            });
            console.log('Subscription creation result:', result);
            return result;
          } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
          }
        },
        onApprove: async (data: any, actions: any) => {
          console.log('Payment approved:', data);
          
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
            console.error('Error updating subscription:', updateError);
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

      const Buttons = window.paypal.Buttons(buttonConfig);

      if (container && await Buttons.isEligible()) {
        await Buttons.render(container);
        console.log('PayPal buttons rendered successfully');
      } else {
        console.error('PayPal Buttons not eligible for rendering');
        setLoadError('Payment system not available for this plan. Please try again later.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: "There was a problem setting up your subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLifetimePayment = async () => {
    if (!session || session.user.email === 'guest@wallpaperhub.com') {
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
      console.log('Starting lifetime payment process...');

      // Create a payment record in the database
      const { data: payment, error: paymentError } = await supabase
        .from('paypal_one_time_payments')
        .insert({
          user_id: session.user.id,
          amount: PLAN_PRICES.lifetime.amount,
          currency: PLAN_PRICES.lifetime.currency,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        throw new Error('Failed to create payment record');
      }

      console.log('Created payment record:', payment);

      // Get PayPal payment link and order ID
      const { data, error } = await supabase.functions.invoke('get-paypal-link');

      if (error) {
        console.error('Error calling get-paypal-link function:', error);
        throw new Error('Failed to get PayPal payment link');
      }

      if (!data?.paypalLink || !data?.orderId) {
        console.error('No PayPal link or order ID received from function');
        throw new Error('Failed to get PayPal payment information');
      }

      // Update the payment record with the PayPal order ID
      const { error: updateError } = await supabase
        .from('paypal_one_time_payments')
        .update({ paypal_order_id: data.orderId })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment record:', updateError);
        // Continue anyway as this is not critical
      }

      // Open PayPal payment link in a new window
      window.open(data.paypalLink, '_blank');

      toast({
        title: "Payment Link Opened",
        description: "Please complete the payment in the new window. Your account will be upgraded once the payment is confirmed.",
      });

      // Start checking payment status
      if (statusCheckInterval.current) {
        window.clearInterval(statusCheckInterval.current);
      }

      statusCheckInterval.current = window.setInterval(() => {
        checkPaymentStatus(data.orderId);
      }, 5000); // Check every 5 seconds

    } catch (error) {
      console.error('Error in lifetime payment flow:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        window.clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {isVip && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-purple-500/10 rounded-lg p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/50" />
                
                <div className="relative space-y-4">
                  <div className="flex items-center justify-center space-x-2 animate-fade-in">
                    <Crown className="w-8 h-8 text-primary fill-primary animate-pulse" />
                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                      Active Member
                    </h2>
                    <Crown className="w-8 h-8 text-primary fill-primary animate-pulse" />
                  </div>
                  
                  {vipType !== 'lifetime' && vipExpiresAt && (
                    <div className="flex items-center justify-center space-x-2 text-gray-600 animate-fade-in">
                      <CalendarClock className="w-5 h-5" />
                      <p className="text-sm">
                        Subscription ends: {format(new Date(vipExpiresAt), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  
                  {vipType === 'lifetime' && (
                    <p className="text-sm text-gray-600 animate-fade-in">
                      ✨ Lifetime VIP Member ✨
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">💎 xxWallpaper VIP Membership</h1>
            <p className="text-gray-600">
              Enjoy 25 daily downloads, exclusive content, batch downloads, and more premium features.
              Subscribe through PayPal for automated subscription management and hassle-free downloading experience.
            </p>
            {loadError && (
              <div className="mt-4 text-red-500 bg-red-50 p-4 rounded-lg">
                {loadError}
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
              onLifetimePayment={handleLifetimePayment}
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
              onLifetimePayment={handleLifetimePayment}
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
              onLifetimePayment={handleLifetimePayment}
              isProcessing={isProcessing}
              loadError={loadError}
              buttonContainerRef={(el) => {
                buttonContainersRef.current['lifetime'] = el;
                lifetimeButtonRef.current = el;
              }}
            />
          </div>

          <VIPBenefits />
        </div>
      </main>
    </div>
  );
};

export default Subscription;
