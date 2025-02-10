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
  const [planIds, setPlanIds] = useState<{[key: string]: string}>({});
  const paypalScriptRef = useRef<HTMLScriptElement | null>(null);
  const buttonContainersRef = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    const loadPaypalScript = async () => {
      try {
        console.log('Fetching PayPal credentials and plan IDs...');
        
        // Fetch PayPal client ID
        const { data: secretData, error: secretError } = await supabase
          .from('secrets')
          .select('value')
          .eq('name', 'PAYPAL_CLIENT_ID')
          .maybeSingle();

        if (secretError || !secretData?.value) {
          console.error('Error loading PayPal client ID:', secretError);
          setLoadError('Failed to load payment system. Please try again later.');
          return;
        }

        // Fetch plan IDs
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('type, paypal_plan_id');

        if (plansError) {
          console.error('Error loading plan IDs:', plansError);
          setLoadError('Failed to load subscription plans. Please try again later.');
          return;
        }

        const planIdMap = plansData.reduce((acc: {[key: string]: string}, plan) => {
          acc[plan.type] = plan.paypal_plan_id;
          return acc;
        }, {});

        setPlanIds(planIdMap);
        console.log('Plan IDs loaded:', planIdMap);

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
        console.error('Error initializing PayPal:', error);
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
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Created subscription record:', subscription);

      // Clear existing PayPal buttons
      const container = buttonContainersRef.current[plan];
      if (container) {
        container.innerHTML = '';
      }

      if (window.paypal) {
        console.log('Initializing PayPal buttons for plan:', plan);
        
        // Common button configuration
        const commonConfig = {
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
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

        // Create buttons based on plan type
        let buttonConfig;
        if (plan === 'lifetime') {
          // One-time payment configuration
          buttonConfig = {
            ...commonConfig,
            createOrder: async (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    currency_code: planDetails.currency,
                    value: planDetails.amount.toString()
                  }
                }]
              });
            }
          };
        } else {
          // Subscription configuration
          buttonConfig = {
            ...commonConfig,
            createSubscription: async (data: any, actions: any) => {
              const planId = planIds[plan];
              if (!planId) {
                throw new Error(`No plan ID found for ${plan} subscription`);
              }
              console.log(`Creating subscription with plan ID: ${planId}`);
              return actions.subscription.create({
                'plan_id': planId
              });
            }
          };
        }

        const Buttons = window.paypal.Buttons(buttonConfig);

        if (container && await Buttons.isEligible()) {
          Buttons.render(container);
        } else {
          console.error('PayPal Buttons not eligible for rendering');
          setLoadError('Payment system not available for this plan. Please try again later.');
        }
      } else {
        console.error('PayPal SDK not loaded');
        toast({
          title: "Error",
          description: "Payment system is not ready. Please try again later.",
          variant: "destructive",
        });
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
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Monthly VIP</CardTitle>
                <CardDescription>Perfect for short-term needs</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">$4.99</div>
                <div className="text-sm text-gray-500">per month</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe('monthly')}
                  disabled={isProcessing || !!loadError}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Monthly
                </Button>
                <div 
                  id="paypal-button-monthly" 
                  ref={(el) => buttonContainersRef.current['monthly'] = el}
                ></div>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Yearly VIP</CardTitle>
                <CardDescription>Save 33% with annual billing</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">$39.99</div>
                <div className="text-sm text-gray-500">per year</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => handleSubscribe('yearly')}
                  disabled={isProcessing || !!loadError}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Yearly
                </Button>
                <div 
                  id="paypal-button-yearly" 
                  ref={(el) => buttonContainersRef.current['yearly'] = el}
                ></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifetime VIP</CardTitle>
                <CardDescription>One-time purchase, forever access</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">$99.99</div>
                <div className="text-sm text-gray-500">one-time payment</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe('lifetime')}
                  disabled={isProcessing || !!loadError}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy Lifetime
                </Button>
                <div 
                  id="paypal-button-lifetime" 
                  ref={(el) => buttonContainersRef.current['lifetime'] = el}
                ></div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">🔓 VIP Member Benefits</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "25 daily downloads (resets at 00:00)",
                "Exclusive VIP wallpapers (AI-generated, 8K HD, Dynamic)",
                "Ad-free experience",
                "Priority access to new uploads",
                "Cloud collection storage"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscription;
