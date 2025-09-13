import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentModeManager = () => {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test');
  const [prices, setPrices] = useState<any>({});
  const [newPrices, setNewPrices] = useState({
    test: { monthly: '', yearly: '', lifetime: '' },
    live: { monthly: '', yearly: '', lifetime: '' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadPaymentSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-mode');
      if (error) throw error;
      
      setCurrentMode(data.mode);
      setPrices(data.prices);
      
      // Load all price settings
      const { data: settings } = await supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (settings) {
        setNewPrices({
          test: {
            monthly: settings.test_monthly_price_id || '',
            yearly: settings.test_yearly_price_id || '',
            lifetime: settings.test_lifetime_price_id || ''
          },
          live: {
            monthly: settings.live_monthly_price_id || '',
            yearly: settings.live_yearly_price_id || '',
            lifetime: settings.live_lifetime_price_id || ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to load payment settings",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const switchMode = async (mode: 'test' | 'live') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('set-payment-mode', {
        body: { mode }
      });
      
      if (error) throw error;
      
      setCurrentMode(mode);
      toast({
        title: "Success",
        description: `Switched to ${mode} mode`,
      });
      
      // Reload settings
      await loadPaymentSettings();
    } catch (error) {
      console.error('Error switching mode:', error);
      toast({
        title: "Error",
        description: "Failed to switch payment mode",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrices = async (mode: 'test' | 'live') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('set-payment-mode', {
        body: { 
          mode: currentMode,
          prices: newPrices[mode]
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Updated ${mode} mode prices`,
      });
      
      // Reload settings
      await loadPaymentSettings();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast({
        title: "Error",
        description: "Failed to update prices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Mode Manager
            <Badge variant={currentMode === 'live' ? 'destructive' : 'secondary'}>
              {currentMode.toUpperCase()} MODE
            </Badge>
          </CardTitle>
          <CardDescription>
            Switch between test and live payment modes. Make sure to use appropriate Stripe keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => switchMode('test')}
              variant={currentMode === 'test' ? 'default' : 'outline'}
              disabled={isLoading}
            >
              Switch to Test Mode
            </Button>
            <Button 
              onClick={() => switchMode('live')}
              variant={currentMode === 'live' ? 'destructive' : 'outline'}
              disabled={isLoading}
            >
              Switch to Live Mode
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Current Monthly Price</Label>
              <p className="text-sm text-muted-foreground">{prices.monthly || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Yearly Price</Label>
              <p className="text-sm text-muted-foreground">{prices.yearly || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Lifetime Price</Label>
              <p className="text-sm text-muted-foreground">{prices.lifetime || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configure Price IDs</CardTitle>
          <CardDescription>
            Set Stripe price IDs for different modes. Make sure these match your Stripe dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="test">Test Mode Prices</TabsTrigger>
              <TabsTrigger value="live">Live Mode Prices</TabsTrigger>
            </TabsList>
            
            <TabsContent value="test" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="test-monthly">Monthly Price ID</Label>
                  <Input
                    id="test-monthly"
                    value={newPrices.test.monthly}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      test: { ...prev.test, monthly: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <Label htmlFor="test-yearly">Yearly Price ID</Label>
                  <Input
                    id="test-yearly"
                    value={newPrices.test.yearly}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      test: { ...prev.test, yearly: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <Label htmlFor="test-lifetime">Lifetime Price ID</Label>
                  <Input
                    id="test-lifetime"
                    value={newPrices.test.lifetime}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      test: { ...prev.test, lifetime: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
              </div>
              <Button 
                onClick={() => updatePrices('test')}
                disabled={isLoading}
              >
                Update Test Prices
              </Button>
            </TabsContent>
            
            <TabsContent value="live" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="live-monthly">Monthly Price ID</Label>
                  <Input
                    id="live-monthly"
                    value={newPrices.live.monthly}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      live: { ...prev.live, monthly: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <Label htmlFor="live-yearly">Yearly Price ID</Label>
                  <Input
                    id="live-yearly"
                    value={newPrices.live.yearly}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      live: { ...prev.live, yearly: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <Label htmlFor="live-lifetime">Lifetime Price ID</Label>
                  <Input
                    id="live-lifetime"
                    value={newPrices.live.lifetime}
                    onChange={(e) => setNewPrices(prev => ({
                      ...prev,
                      live: { ...prev.live, lifetime: e.target.value }
                    }))}
                    placeholder="price_xxx"
                  />
                </div>
              </div>
              <Button 
                onClick={() => updatePrices('live')}
                disabled={isLoading}
                variant="destructive"
              >
                Update Live Prices
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModeManager;