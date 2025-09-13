
import { DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubscriptionPlanCardProps {
  title: string;
  description: string;
  price: number;
  interval: string;
  planType: 'monthly' | 'yearly' | 'lifetime';
  isHighlighted?: boolean;
  onSubscribe: (plan: string) => void;
  onLifetimePayment: () => void;
  isProcessing: boolean;
  loadError: string | null;
  buttonContainerRef: (el: HTMLDivElement | null) => void;
}

const SubscriptionPlanCard = ({
  title,
  description,
  price,
  interval,
  planType,
  isHighlighted,
  onSubscribe,
  onLifetimePayment,
  isProcessing,
  loadError,
  buttonContainerRef
}: SubscriptionPlanCardProps) => {
  return (
    <Card className={isHighlighted ? "border-primary" : ""}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="text-3xl font-bold text-primary mt-2">${price}</div>
        <div className="text-sm text-gray-500">{interval}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full" 
          variant={isHighlighted ? "default" : "outline"}
          onClick={() => planType === 'lifetime' ? onLifetimePayment() : onSubscribe(planType)}
          disabled={isProcessing}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          {planType === 'lifetime' ? 'Buy Lifetime' : `Subscribe ${planType === 'monthly' ? 'Monthly' : 'Yearly'}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionPlanCard;
