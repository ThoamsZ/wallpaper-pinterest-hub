import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlanCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  isActive?: boolean;
  isRecommended?: boolean;
  onSubscribe: () => void;
  loading?: boolean;
}

export const SubscriptionPlanCard = ({
  title,
  price,
  description,
  features,
  isActive = false,
  isRecommended = false,
  onSubscribe,
  loading = false
}: SubscriptionPlanCardProps) => {
  return (
    <Card className={`relative ${isRecommended ? 'border-primary' : ''} ${isActive ? 'ring-2 ring-primary' : ''}`}>
      {isRecommended && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          Recommended
        </Badge>
      )}
      {isActive && (
        <Badge variant="secondary" className="absolute -top-2 right-4">
          Current Plan
        </Badge>
      )}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="text-3xl font-bold">{price}</div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <span className="mr-2">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <Button 
          onClick={onSubscribe} 
          disabled={loading || isActive}
          className="w-full"
          variant={isRecommended ? "default" : "outline"}
        >
          {isActive ? "Current Plan" : loading ? "Processing..." : "Subscribe"}
        </Button>
      </CardContent>
    </Card>
  );
};