
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

const Subscription = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleSubscribe = async (plan: string) => {
    if (!session) {
      navigate("/auth");
      return;
    }
    // TODO: Implement PayPal subscription logic
    console.log("Subscribing to plan:", plan);
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
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe('monthly')}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Monthly
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Yearly VIP</CardTitle>
                <CardDescription>Save 33% with annual billing</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">$39.99</div>
                <div className="text-sm text-gray-500">per year</div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => handleSubscribe('yearly')}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Subscribe Yearly
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifetime VIP</CardTitle>
                <CardDescription>One-time purchase, forever access</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">$99.99</div>
                <div className="text-sm text-gray-500">one-time payment</div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe('lifetime')}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy Lifetime
                </Button>
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
