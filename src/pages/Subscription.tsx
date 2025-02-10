
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
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadPaypalScript = async () => {
      // Get PayPal client ID from Supabase
      const { data: { value: clientId }, error } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'PAYPAL_CLIENT_ID')
        .single();

      if (error || !clientId) {
        console.error('Error loading PayPal client ID:', error);
        return;
      }

      // Load PayPal SDK
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    loadPaypalScript();
  }, []);

  const handleSubscribe = async (plan: string) => {
    if (!session) {
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
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Initialize PayPal buttons
      if (window.paypal) {
        const Buttons = window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe'
          },
          createOrder: async () => {
            if (plan === 'lifetime') {
              const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  intent: 'CAPTURE',
                  purchase_units: [{
                    amount: {
                      currency_code: planDetails.currency,
                      value: planDetails.amount.toString()
                    }
                  }]
                })
              });
              const data = await response.json();
              return data.id;
            }
          },
          createSubscription: async (data: any, actions: any) => {
            if (plan !== 'lifetime') {
              return actions.subscription.create({
                'plan_id': plan === 'monthly' ? 'P-MONTHLY_PLAN_ID' : 'P-YEARLY_PLAN_ID',
              });
            }
          },
          onApprove: async (data: any, actions: any) => {
            if (plan === 'lifetime') {
              await actions.order.capture();
            }
            
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

            // Refresh the page to update UI
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
        });

        const container = document.getElementById(`paypal-button-${plan}`);
        if (container) {
          container.innerHTML = '';
          Buttons.render(container);
        }
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
                  disabled={isProcessing}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Monthly
                </Button>
                <div id="paypal-button-monthly"></div>
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
                  disabled={isProcessing}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Yearly
                </Button>
                <div id="paypal-button-yearly"></div>
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
                  disabled={isProcessing}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy Lifetime
                </Button>
                <div id="paypal-button-lifetime"></div>
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

