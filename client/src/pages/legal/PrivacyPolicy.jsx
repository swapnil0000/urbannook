import React, { useEffect } from 'react';
import DocShell from '../../component/DocShell';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <DocShell eyebrow="Security" title="Privacy Policy" sub="Your trust is our most valuable asset.">
        {/* Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 01.</span> What We Collect</h2>
            <p className="leading-relaxed text-muted mb-4">
              When you purchase something from our store, we collect personal information you give us such as your name, address, and email address.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-hair">
                    <h3 className="text-brand font-bold text-sm mb-1">Identity Data</h3>
                    <p className="text-xs text-muted">Name, Username, Shipping Address</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-hair">
                    <h3 className="text-brand font-bold text-sm mb-1">Contact Data</h3>
                    <p className="text-xs text-muted">Email Address, Phone Number</p>
                </div>
            </div>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 02.</span> Consent</h2>
            <p className="leading-relaxed text-muted">
              When you provide us with personal information to complete a transaction, verify your credit card, place an order, arrange for a delivery or return a purchase, we imply that you consent to our collecting it and using it for that specific reason only.
            </p>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 03.</span> Disclosure</h2>
            <p className="leading-relaxed text-muted">
              We may disclose your personal information if we are required by law to do so or if you violate our Terms of Service. We do <strong className="text-ink font-semibold">not</strong> sell your data to third-party marketers.
            </p>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 04.</span> Third-Party Services</h2>
            <p className="leading-relaxed text-muted mb-4">
              In general, the third-party providers used by us (such as Razorpay for payments and ShipRocket for logistics) will only collect, use and disclose your information to the extent necessary to allow them to perform the services they provide to us.
            </p>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 05.</span> Security</h2>
            <p className="leading-relaxed text-muted">
              To protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered or destroyed.
            </p>
          </section>

        </div>
    </DocShell>
  );
};

export default PrivacyPolicy;