import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import { VIPBenefits } from '@/components/subscription/VIPBenefits';
const Subscription = () => {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [vipType, setVipType] = useState<string>('none');
  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('test');
  const [prices, setPrices] = useState<any>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Get payment mode and prices
  const getPaymentSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('get-payment-mode');
      if (error) throw error;
      setPaymentMode(data.mode);
      setPrices(data.prices);
      console.log('Payment settings loaded:', data);
    } catch (error) {
      console.error('Error getting payment settings:', error);
      setLoadError('Failed to load payment settings');
    }
  };
  const checkSubscriptionStatus = async () => {
    try {
      console.log('Checking subscription status...');
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        navigate('/auth');
        return;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }
      console.log('Subscription check response:', data);
      if (data.subscribed) {
        setIsVip(true);
        setVipType(data.vip_type || 'none');
        setVipExpiresAt(data.subscription_end);
        toast({
          title: "VIP Status Active",
          description: `You have ${data.vip_type} VIP access${data.subscription_end ? ` until ${new Date(data.subscription_end).toLocaleDateString()}` : ' (lifetime)'}`
        });
      } else {
        setIsVip(false);
        setVipType('none');
        setVipExpiresAt(null);
      }
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    getPaymentSettings();
    checkSubscriptionStatus();

    // Check for success/cancel parameters
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Checking status..."
      });
      // Check subscription status after a short delay to allow webhook processing
      setTimeout(checkSubscriptionStatus, 2000);
    } else if (canceled === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. You can try again anytime.",
        variant: "destructive"
      });
    }
  }, [searchParams]);
  const handleSubscribe = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    setIsProcessing(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      const priceId = prices[plan];
      console.log('Current prices object:', prices);
      console.log(`Looking for ${plan} plan price:`, priceId);
      if (!priceId) {
        console.error(`Price ID not found for ${plan} plan. Available prices:`, prices);
        throw new Error(`Price ID not found for ${plan} plan`);
      }
      console.log(`Creating checkout for ${plan} plan with price ID:`, priceId);
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }
      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  if (loadError) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Error Loading Payment Settings</h1>
            <p className="text-muted-foreground">{loadError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-12">
          
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Choose Your VIP Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock unlimited downloads and exclusive features with our VIP membership
          </p>
        </div>

        {isVip && <Card className="mb-8 border-primary/20 bg-primary/5">
            
            
          </Card>}

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <SubscriptionPlanCard title="Monthly VIP" price="$4.99" description="Perfect for trying out VIP features" features={["20 daily downloads", "No ads", "High quality images"]} isActive={vipType === 'monthly'} onSubscribe={() => handleSubscribe('monthly')} loading={isProcessing} />
          
          <SubscriptionPlanCard title="Yearly VIP" price="$39.99" description="Best value with more downloads" features={["30 daily downloads", "No ads", "High quality images", "Priority support"]} isActive={vipType === 'yearly'} onSubscribe={() => handleSubscribe('yearly')} loading={isProcessing} />
          
          <SubscriptionPlanCard title="Lifetime VIP" price="$59.99" description="One-time payment for unlimited access" features={["Unlimited downloads", "No ads", "High quality images", "Priority support", "Exclusive content"]} isActive={vipType === 'lifetime'} isRecommended={true} onSubscribe={() => handleSubscribe('lifetime')} loading={isProcessing} />
        </div>

        <VIPBenefits />
      </div>
    </div>;
};
export default Subscription;