
import { Card } from "@/components/ui/card";

const Policy = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Information Collection</h2>
          <p>
            We collect information that you provide directly to us, including when you:
            - Create an account
            - Upload wallpapers
            - Create collections
            - Interact with other users' content
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Use of Information</h2>
          <p>
            We use the information we collect to:
            - Provide and maintain our services
            - Process your uploads and downloads
            - Communicate with you about our services
            - Monitor and analyze trends and usage
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
          <p>
            We do not share your personal information with third parties except:
            - With your consent
            - To comply with legal obligations
            - To protect our rights and safety
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Security</h2>
          <p>
            We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Your Rights</h2>
          <p>
            You have the right to:
            - Access your personal information
            - Update or correct your information
            - Delete your account and associated data
            - Opt-out of marketing communications
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
            xxwallpaperofficial@gmail.com
          </p>
        </section>
      </Card>
    </div>
  );
};

export default Policy;
