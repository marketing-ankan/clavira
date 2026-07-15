// Standard policy content for a fine-jewellery storefront.
// DRAFT copy — to be reviewed/approved by the client and their legal counsel before launch.

export const POLICIES = {
    'shipping': {
        title: 'Shipping Policy',
        intro: 'Every Clavira piece is dispatched fully insured, in tamper-evident luxury packaging.',
        sections: [
            ['Dispatch time', 'In-stock pieces are dispatched within 3–5 business days. Made-to-order and Jadau Kundan pieces are handcrafted to your specification and typically ship in 3–5 weeks; your order confirmation will carry an indicative date.'],
            ['Domestic shipping (India)', 'Complimentary insured shipping across India via trusted, fully-insured logistics partners. A signature is required on delivery for security.'],
            ['International shipping (NRI)', 'We ship, fully insured, to over 50 countries. International orders may attract customs duties and import taxes levied by the destination country, which are payable by the recipient.'],
            ['Tracking', 'A tracking link is shared by email and SMS the moment your order is dispatched.'],
        ],
    },
    'returns': {
        title: 'Returns & Exchange',
        intro: 'Your confidence matters. Clavira offers a considered returns and lifetime exchange framework.',
        sections: [
            ['15-day returns', 'Ready-to-ship pieces may be returned within 15 days of delivery, unworn and in their original condition with all certificates, tags and packaging intact. Refunds are processed to the original payment method within 7–10 business days of inspection.'],
            ['Made-to-order & customised', 'Bespoke, engraved, resized and made-to-order pieces are crafted uniquely for you and are not eligible for return, though our exchange promise below still applies.'],
            ['Lifetime exchange', 'Exchange your Clavira gold jewellery at any time with zero making-charge deduction and up to 98% gold-value return. Diamonds are eligible for up to 70% value return under our lifetime exchange promise.'],
            ['How to begin', 'Write to care@clavira.in or contact your jewellery consultant with your order number to initiate a return or exchange.'],
        ],
    },
    'exchange': {
        title: 'Gold & Diamond Exchange Promise',
        intro: 'Jewellery that holds its worth — backed in writing.',
        sections: [
            ['Zero deduction on gold', 'Exchange your Clavira gold for another Clavira creation with no making-charge deduction on the gold value.'],
            ['98% gold value return', 'On buy-back, receive up to 98% of the prevailing gold value — among the most generous in the industry.'],
            ['70% diamond value return', 'Our lifetime exchange promise returns up to 70% of your diamond’s value toward a future Clavira purchase.'],
            ['Certified & transparent', 'Every valuation references your BIS hallmark and IGI certificate, and the published gold rate of the day. No hidden deductions.'],
        ],
    },
    'privacy': {
        title: 'Privacy Policy',
        intro: 'We collect only what we need to serve you, and we never sell your data.',
        sections: [
            ['What we collect', 'Contact and delivery details you provide (name, email, phone, address), your order history, and standard technical data (device, browser, and analytics) used to improve the site.'],
            ['Payments', 'Card, UPI and banking details are handled entirely by our PCI-DSS-compliant payment gateway (Razorpay). Clavira never sees or stores your full payment credentials.'],
            ['How we use it', 'To process and deliver orders, provide support, honour certificates and exchanges, and — only with your consent — to share collection updates.'],
            ['Your rights', 'You may request access to, correction of, or deletion of your personal data at any time by writing to privacy@clavira.in.'],
        ],
    },
    'terms': {
        title: 'Terms & Conditions',
        intro: 'The terms on which we offer this website and our jewellery.',
        sections: [
            ['Products & pricing', 'Prices are shown in Indian Rupees and reflect the prevailing gold rate, which fluctuates daily. We reserve the right to correct pricing errors and confirm final pricing at order acceptance.'],
            ['Reference designs', 'Images are curated reference designs; as each piece is handcrafted, minor variations in finish, weight and stone placement are natural and expected.'],
            ['Certification', 'Diamonds are lab-grown by default, with natural diamonds available on request. Applicable pieces carry IGI certification and BIS hallmarking.'],
            ['Governing law', 'These terms are governed by the laws of India, with exclusive jurisdiction of the courts at the seller’s registered location.'],
        ],
    },
    'contact-info': {
        title: 'Care & Contact',
        intro: 'We are here to help — from selection to sizing to certification.',
        sections: [
            ['Client care', 'Email care@clavira.in for orders, exchanges, and certification queries. We respond within one business day.'],
            ['Book a consultation', 'Request a virtual or in-atelier consultation through our Contact page — ideal for bridal and bespoke commissions.'],
            ['Certificate verification', 'Verify any IGI or BIS report number instantly on our Verify Certificate page.'],
        ],
    },
};

export const POLICY_LINKS = [
    ['Shipping Policy', '/policies/shipping'],
    ['Returns & Exchange', '/policies/returns'],
    ['Exchange Promise', '/policies/exchange'],
    ['Privacy Policy', '/policies/privacy'],
    ['Terms & Conditions', '/policies/terms'],
];
