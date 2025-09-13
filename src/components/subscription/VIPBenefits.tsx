import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  {
    title: "Unlimited Downloads",
    description: "Download as many wallpapers as you want without daily limits"
  },
  {
    title: "High Quality Images",
    description: "Access to full resolution, uncompressed wallpapers"
  },
  {
    title: "Exclusive Content",
    description: "VIP-only wallpapers and collections from premium creators"
  },
  {
    title: "Ad-Free Experience",
    description: "Browse and download without any advertisements"
  },
  {
    title: "Priority Support",
    description: "Get priority customer support and faster response times"
  },
  {
    title: "Early Access",
    description: "Be the first to access new wallpapers and features"
  }
];

export const VIPBenefits = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>VIP Benefits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-semibold">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};