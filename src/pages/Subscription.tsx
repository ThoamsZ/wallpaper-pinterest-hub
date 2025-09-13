import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SubscriptionPlanCard from "@/components/subscription/SubscriptionPlanCard";
import VIPBenefits from "@/components/subscription/VIPBenefits";
import { Crown, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

// Stripe plan configuration 
const STRIPE_PLANS = {
  monthly: {
    priceId: 'price_1S70IWD4StWDh7sZUWXlE3SV', // Test price ID
    price: 4.99,
    name: 'Monthly VIP'
  },
  yearly: {
    priceId: 'price_1S70IsD4StWDh7sZ7Xu0o461', // Test price ID
    price: 39.99,
    name: 'Yearly VIP'
  },
  lifetime: {
    priceId: 'price_1S70JDD4StWDh7sZSmdNnAwt', // Test price ID
    price: 59.99,
    name: 'Lifetime VIP'
  }
};

const Subscription = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [vipType, setVipType] = useState<string | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [session]);

  // Check subscription status on page load and after successful payments
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Checking status...",
      });
      setTimeout(() => {
        checkSubscriptionStatus();
        // Remove URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000);
    }
    if (urlParams.get('canceled') === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. You can try again anytime.",
      });
      // Remove URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setIsVip(data.subscribed);
      setVipType(data.vip_type);
      setVipExpiresAt(data.subscription_end);
    } catch (error) {
      console.error('Error checking VIP status:', error);
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

    setIsProcessing(true);
    
    try {
      const planConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
      if (!planConfig) {
        throw new Error('Invalid plan type');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: planConfig.priceId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to Checkout",
          description: "Opening secure Stripe checkout in a new tab...",
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : 'An error occurred during checkout',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to access customer portal');
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening Customer Portal",
          description: "Manage your subscription in the new tab...",
        });
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Portal Error",
        description: error instanceof Error ? error.message : 'Failed to open customer portal',
        variant: "destructive",
      });
    }
  };

  const handleLifetimePayment = () => {
    handleSubscribe('lifetime');
  };

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
                      Active VIP Member
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

                  <div className="pt-4">
                    <Button 
                      onClick={handleManageSubscription}
                      variant="outline"
                      className="bg-white/80 hover:bg-white"
                    >
                      Manage Subscription
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">💎 xxWallpaper VIP Membership</h1>
            <p className="text-gray-600">
              Enjoy 25 daily downloads, exclusive content, batch downloads, and more premium features.
              Secure payments powered by Stripe with instant activation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <SubscriptionPlanCard
              title="Monthly VIP"
              description="Perfect for short-term needs"
              price={STRIPE_PLANS.monthly.price}
              interval="per month"
              planType="monthly"
              onSubscribe={handleSubscribe}
              onLifetimePayment={handleLifetimePayment}
              isProcessing={isProcessing}
              loadError={null}
              buttonContainerRef={() => {}}
            />
            <SubscriptionPlanCard
              title="Yearly VIP"
              description="Save 33% with annual billing"
              price={STRIPE_PLANS.yearly.price}
              interval="per year"
              planType="yearly"
              isHighlighted={true}
              onSubscribe={handleSubscribe}
              onLifetimePayment={handleLifetimePayment}
              isProcessing={isProcessing}
              loadError={null}
              buttonContainerRef={() => {}}
            />
            <SubscriptionPlanCard
              title="Lifetime VIP"
              description="One-time purchase, forever access"
              price={STRIPE_PLANS.lifetime.price}
              interval="one-time payment"
              planType="lifetime"
              onSubscribe={handleSubscribe}
              onLifetimePayment={handleLifetimePayment}
              isProcessing={isProcessing}
              loadError={null}
              buttonContainerRef={() => {}}
            />
          </div>

          <VIPBenefits />
        </div>
      </main>
    </div>
  );
};

export default Subscription;