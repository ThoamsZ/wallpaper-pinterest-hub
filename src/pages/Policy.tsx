
import { Mail } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Policy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
          <div className="max-w-4xl mx-auto prose prose-neutral dark:prose-invert">
            <h1 className="text-3xl font-bold mb-4">Terms of Use</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Effective Date: October 26, 2023<br />
              Last Updated: October 26, 2023
            </p>

            <p>Welcome to xxWallpaper (hereinafter referred to as "the Website" or "we"). By accessing or using the Website, you agree to be bound by these Terms of Use (hereinafter referred to as "Terms"). If you do not agree to these Terms, please do not use the Website.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Service Overview</h2>
            <p>xxWallpaper provides users with tools and services for generating, editing, and sharing images. Specific features and services may be updated or modified at our discretion.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Eligibility</h2>
            <p>You must be at least 13 years old (or the minimum age of digital consent in your jurisdiction) to use the Website. If you are under the legal age, you may only use the Website with the consent and supervision of a parent or guardian.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Responsibilities</h2>
            <p>You agree not to use the Website for any illegal or unauthorized purpose.</p>
            <p>You agree not to upload, post, or share any content that infringes on the intellectual property, privacy, or other rights of any third party.</p>
            <p>You are solely responsible for your conduct and content on the Website.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
            <p>All content on the Website (including but not limited to text, images, software, and code) is protected by copyright, trademark, and other intellectual property laws.</p>
            <p>Content you generate or upload to the Website remains your property or the property of the respective rights holder. However, by using the Website, you grant us a worldwide, non-exclusive, transferable license to use, reproduce, modify, display, and distribute your content.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Disclaimer of Warranties</h2>
            <p>The Website is provided "as is" without any warranties, express or implied. We do not guarantee that the Website will be error-free, secure, or uninterrupted. Your use of the Website is at your own risk.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, we shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the Website.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Modifications to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Changes will be posted on this page, and your continued use of the Website after the effective date constitutes acceptance of the revised Terms.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Termination</h2>
            <p>We may terminate or suspend your access to the Website at any time, with or without notice, for any reason.</p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Copyright Infringement Notice</h2>
            <p>If you believe that any content on xxWallpaper infringes your intellectual property rights, please notify us at the following contact information:</p>
            
            <div className="flex items-center gap-2 my-4">
              <Mail className="h-4 w-4" />
              <a href="mailto:xxwallpaperofficial@gmail.com" className="text-primary hover:underline">
                xxwallpaperofficial@gmail.com
              </a>
            </div>

            <p>Your notice must include the following information:</p>
            <ul className="list-disc pl-6 mt-4 mb-8">
              <li>Your name, contact information, and proof of ownership (e.g., copyright registration certificate).</li>
              <li>A detailed description of the infringing material and its location on the Website.</li>
              <li>A statement that you have a good faith belief that the use of the material is not authorized.</li>
              <li>A statement that the information in your notice is accurate and, under penalty of perjury, that you are authorized to act on behalf of the rights holder.</li>
            </ul>

            <p>We will respond to valid notices promptly and take appropriate action in accordance with the Digital Millennium Copyright Act (DMCA).</p>

            <h1 className="text-3xl font-bold mt-16 mb-4">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Effective Date: October 26, 2023<br />
              Last Updated: October 26, 2023
            </p>

            <p>Your privacy is important to us. This Privacy Policy explains how xxWallpaper collects, uses, stores, and protects your personal information.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-4 mb-8">
              <li>Information You Provide: Such as your name, email address, and payment details when you register or use our services.</li>
              <li>Automatically Collected Information: Such as your IP address, device information, browser type, and usage data.</li>
              <li>Third-Party Information: Such as information provided by social media platforms if you log in through them.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We may use your information for the following purposes:</p>
            <ul className="list-disc pl-6 mt-4 mb-8">
              <li>To provide, maintain, and improve the Website and its services.</li>
              <li>To communicate with you, including sending notifications and updates.</li>
              <li>To analyze user behavior and improve user experience.</li>
              <li>To comply with legal obligations or respond to lawful requests.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Sharing Your Information</h2>
            <p>We do not sell your personal information to third parties. However, we may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 mt-4 mb-8">
              <li>With your explicit consent.</li>
              <li>With third-party service providers to facilitate our services.</li>
              <li>To comply with legal requirements or protect our rights and property.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
            <p>We implement reasonable technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 mt-4 mb-8">
              <li>The right to access, correct, or delete your data.</li>
              <li>The right to object to or restrict the processing of your data.</li>
              <li>The right to data portability.</li>
            </ul>
            <p>To exercise these rights, please contact us at xxwallpaperofficial@gmail.com.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Children's Privacy</h2>
            <p>The Website is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page, and your continued use of the Website after the effective date constitutes acceptance of the revised policy.</p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Contact Us</h2>
            <p className="mb-16">If you have any questions about these Terms, the Copyright Infringement Notice, or the Privacy Policy, please contact us at xxwallpaperofficial@gmail.com.</p>
          </div>
        </ScrollArea>
      </main>
      <Footer />
    </div>
  );
};

export default Policy;
