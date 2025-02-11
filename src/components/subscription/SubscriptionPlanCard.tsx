
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
        {planType === 'lifetime' ? (
          <a 
            href="https://www.sandbox.paypal.com/ncp/payment/AN2TT43YXVM8C" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button 
              className="w-full" 
              variant={isHighlighted ? "default" : "outline"}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Buy Lifetime Access
            </Button>
          </a>
        ) : (
          <>
            <Button 
              className="w-full" 
              variant={isHighlighted ? "default" : "outline"}
              onClick={() => onSubscribe(planType)}
              disabled={isProcessing || !!loadError}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Subscribe {planType === 'monthly' ? 'Monthly' : 'Yearly'}
            </Button>
            <div 
              id={`paypal-button-${planType}`} 
              ref={buttonContainerRef}
            ></div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionPlanCard;
