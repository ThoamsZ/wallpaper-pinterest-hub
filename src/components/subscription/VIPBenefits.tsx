
import { CheckCircle2 } from "lucide-react";

const VIPBenefits = () => {
  const benefits = [
    "25 daily downloads (resets at 00:00)",
    "Exclusive VIP wallpapers (AI-generated, 8K HD, Dynamic)",
    "Ad-free experience",
    "Priority access to new uploads",
    "Cloud collection storage"
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">🔓 VIP Member Benefits</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500 w-5 h-5" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VIPBenefits;
