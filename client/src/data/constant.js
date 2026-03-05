   export const aboutValues = [
    {
      id: "01",
      title: "Obsessive Quality",
      icon: "fa-gem",
      desc: "We don't just pick products; we test them for durability, texture, and soul. Every piece must earn its place in your home.",
    },
    {
      id: "02",
      title: "Radical Transparency",
      icon: "fa-scale-balanced",
      desc: "No hidden fees, no misleading materials. What you see is precisely the premium craftsmanship you receive.",
    },
    {
      id: "03",
      title: "Design Democracy",
      icon: "fa-compass-drafting",
      desc: "Great aesthetics shouldn't be a luxury. We utilize modern manufacturing to make architectural beauty accessible.",
    },
    {
      id: "04",
      title: "Human Connection",
      icon: "fa-handshake",
      desc: "Real support, secure transactions, and a dedicated team that treats your investment with the respect it deserves.",
    }
  ];

  export const abusiveWords = [
  // --- English abusive words ---
  "fuck","shit","bitch","bastard","asshole","dick","piss","crap","damn",
  "cock","slut","whore","faggot","nigger","bollocks","bugger","wanker","arse",
  "screw","douche","prick","jerk","twat","tosser","pussy","motherfucker","cunt",
  "idiot","moron","dumbass","retard","stupid","loser","ass","hell","dammit",
  "bitchy","slutty","twit","fool","sucker","shithead","asswipe","clown",
  "cockhead","douchebag","dickhead","jerkoff","nigga","dingleberry","turd",
  "dipshit","fuckface","arsehole","shitbag","cocksucker","buttwipe","wazzock",
  "twatwaffle","shithole","dickwad","fuckhead","prickface","asshat","fucknut",
  "bollocks","tits","twatwaffle","cuntface","dicknose","assmunch","shitheel",
  "twitface","jackass","dumbfuck","numbnuts","dickface","cockface","arsewipe",
  "fuckstick","shitstain","twatwaffle","dumbshit","fucky","shitter","ballsack",
  "fucko","assclown","fuk","bastardo","dickweed","shitbagger",

  // --- Hindi / Hinglish abusive words ---
  "chutiya","bhosdiwala","madarchod","gaand","randi","gandu","harami","bhenchod",
  "bhosdike","lund","muth","lundwali","lundka","randiwaali","haramzada","saala",
  "kutte","chutiye","gand","chodu","behenchod","madarchodi","lundbhand","chutiyapa",
  "gaandfaad","randiya","madarchodiya","lundbhandi","haramkhor","chutmar","gandmar",
  "chutiyapa","haramkhor","bhosdike","saala","chutiya","harami","bhenchod","lundka",
  "randi","chodu","madarchod","gandu","saala","harami","chutiya","bhosdiwala",
  "lundbhand","madarchodiyan","randiwaali","haramzada","bhenchodiyan","saale",
  "chod","chut","gand","harami","lund","madar","bhosda","chutmar","haramiya",
  "saali","bhen","chutiyega","chutiya","chutiye","bhosdiwala","randiwaale"
];


 export const instagramPosts = [
    {
        id: 1,
        // Replace this image with screenshot of Reel 1
        image: "/insta_templates/template1.webp", 
        likes: "2.3k",
        comments: "42",
        caption: "New Arrival: 3D Printed Magic ✨",
        link: "https://www.instagram.com/reel/DTumPdjAdNt/?igsh=MW8xdmJpamZ2bGh0ZA=="
    },
    {
        id: 2,
        image: "/insta_templates/template2.webp",
        likes: "1.8k",
        comments: "15",
        caption: "UrbanNook Aesthetics 🌿",
        link: "https://www.instagram.com/reel/DTcCR9LgdhS/?igsh=MWF3ZnczZmhrZjl2bw=="
    },
    {
        id: 3,
        image: "/insta_templates/template3.webp",
        likes: "3.1k",
        comments: "89",
        caption: "Illuminating spaces 💡",
        link: "https://www.instagram.com/reel/DTMezUqgbhy/?igsh=MWdmaW5lYzk3ZXJ4NA=="
    },
    {
        id: 4,
        image: "/insta_templates/template3.webp",
        likes: "1.7k",
        comments: "22",
        caption: "Crafted for you 🔑",
        link: "https://www.instagram.com/reel/DTkE46tAf0G/?igsh=dDJ4Y3J1anl1NGhu"
    },
    {
        id: 5,
        image: "/insta_templates/template3.webp",
        likes: "1.9k",
        comments: "31",
        caption: "The Urban Standard 💕",
        link: "https://www.instagram.com/reel/DT5gZ80ASaS/?igsh=bXpuM3pmcHY2aW4z"
    }
];


export  const socialLinks = [
    {
      id: 'whatsapp',
      name: 'Chat on WhatsApp',
      icon: 'fa-brands fa-whatsapp',
      color: 'bg-[#25D366]',
      link: 'https://wa.me/+918299638749?text=Hi! I am interested in Urban Nook products.',
    },
    {
      id: 'instagram',
      name: 'Follow on Instagram',
      icon: 'fa-brands fa-instagram',
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]', 
      link: 'https://instagram.com/urbannook.store',
    },
    {
      id: 'email',
      name: 'Email Support',
      icon: 'fa-solid fa-envelope',
      color: 'bg-blue-600',
      link: 'mailto:support@urbannook.in',
    },
    {
      id: 'call',
      name: 'Call',
      icon: 'fa-solid fa-phone',
      color: 'bg-emerald-700',
      link: 'tel:+918299638749',
    }
  ];


   export  const subjectOptions = [
        { value: '', label: 'Select a topic...', icon: 'fa-solid fa-circle-question', disabled: true },
        { value: 'Product Inquiry', label: 'Product Inquiry', icon: 'fa-solid fa-box', description: 'Questions about our products' },
        { value: 'Order Support', label: 'Order Support', icon: 'fa-solid fa-truck', description: 'Track orders & delivery' },
        { value: 'Technical Support', label: 'Technical Support', icon: 'fa-solid fa-tools', description: 'Assembly & setup help' },
        { value: 'Returns & Refunds', label: 'Returns & Refunds', icon: 'fa-solid fa-undo', description: 'Return policy & refunds' },
        { value: 'General Inquiry', label: 'General Inquiry', icon: 'fa-solid fa-comment', description: 'Other questions' }
    ];

export const contactInfo = [
    {
        id: 1,
        icon: "fa-solid fa-phone",
        title: "Contact Number",
        info: "+91 82996 38749",
        subInfo: "Mon-Sat, 9am - 7pm",
    },
    {
        id: 2,
        icon: "fa-solid fa-envelope",
        title: "Any Type Of Enquires",
        info: "support@urbannook.in",
        subInfo: "Response within 24h",
    },
    {
        id: 3,
        icon: "fa-solid fa-location-dot",
        title: "Our Office",
        info: "Gurgaon, India",
        subInfo: "Sector 51, 122001",
    }
];

export const contactPageFaqs = [
    {
        question: "Do you offer custom 3D printed designs?",
        answer: "Yes, we love bringing your ideas to life. Whether it's a specific color variant or a completely bespoke piece, select 'Interior Design' in the form and detail your vision."
    },
    {
        question: "How long does standard shipping take?",
        answer: "All our pieces are made to order to ensure the highest quality. Please allow 3-5 business days for production, and an additional 3-4 days for pan-India delivery."
    },
    {
        question: "What is your return policy?",
        answer: "We offer a hassle-free 7-day return policy for any items damaged in transit. We just request a quick unboxing video to process replacements swiftly."
    },
    {
        question: "Do you ship internationally?",
        answer: "Currently, we are focusing on providing the best experience across India. International shipping is on our roadmap for late 2026."
    }
];

export const cityOptions = [
    { value: '', label: 'Select a city...', disabled: true },
    { value: 'Mumbai', label: 'Mumbai', icon: 'fa-solid fa-city' },
    { value: 'Delhi', label: 'Delhi', icon: 'fa-solid fa-city' },
    { value: 'Bangalore', label: 'Bangalore', icon: 'fa-solid fa-city' },
    { value: 'Chennai', label: 'Chennai', icon: 'fa-solid fa-city' },
    { value: 'Kolkata', label: 'Kolkata', icon: 'fa-solid fa-city' },
    { value: 'Hyderabad', label: 'Hyderabad', icon: 'fa-solid fa-city' },
    { value: 'Pune', label: 'Pune', icon: 'fa-solid fa-city' },
    { value: 'Ahmedabad', label: 'Ahmedabad', icon: 'fa-solid fa-city' },
    { value: 'Jaipur', label: 'Jaipur', icon: 'fa-solid fa-city' }
];


export const supportFaqs = [
        {
            id: 1,
            question: 'How do I track my shipment?',
            answer: 'Once your order is dispatched, you will receive a tracking link via email and SMS. You can also view live status in the "My Orders" section of your profile.'
        },
        {
            id: 2,
            question: 'What is the return timeline?',
            answer: 'We accept returns within 7 days of delivery for damaged or defective products. Please ensure the item is unused and in original packaging with tags intact.'
        },
        {
            id: 3,
            question: 'Is assembly required?',
            answer: 'Most of our decor items are pre-assembled. For larger furniture pieces, we provide a detailed, easy-to-follow manual and all necessary tools in the box.'
        },
        {
            id: 4,
            question: 'Do you ship internationally?',
            answer: 'Currently, we ship to all pin codes within India. International shipping is part of our future roadmap. Stay tuned!'
        }
    ];

export const whyChooseUsFeatures = [
  {
    id: 1,
    tag: "AESTHETICS",
    title: "Design-Led Aesthetics",
    description: "Minimal, modern designs made to elevate everyday spaces and lives.",
    bg: "#FAFAF9", 
    color: "#1C1917", 
    accent: "#D97706",
    desktopWidth: '100%',
    mobileWidth: '100%',
    zIndex: 1,
    icon: "fa-solid fa-pen-ruler"
  },
  {
    id: 2,
    tag: "CRAFTSMANSHIP",
    title: "Proudly Homegrown",
    description: "Conceptualized, 3D printed, and wired in our own workshop in India.",
    bg: "#E6DCC5", 
    color: "#1C1917", 
    accent: "#15803D", 
    desktopWidth: '80%',
    mobileWidth: '100%',
    zIndex: 2,
    icon: "fa-solid fa-layer-group"
  },
  {
    id: 3,
    tag: "LOGISTICS",
    title: "Fast Pan-India Delivery",
    description: "Reliable shipping across India, delivered to your doorstep.",
    bg: "#4A675B", 
    color: "#FFFFFF", 
    accent: "#F5DEB3", 
    desktopWidth: '60%',
    mobileWidth: '100%',
    zIndex: 3,
    icon: "fa-solid fa-truck-fast"
  },
  {
    id: 4,
    tag: "PERSONALIZATION",
    title: "Customization Ready",
    description: "Personalize colors, finishes, or details to match your space.",
    bg: "#1a2822", 
    color: "#FFFFFF", 
    accent: "#F5DEB3", 
    desktopWidth: '35%',
    mobileWidth: '100%',
    zIndex: 4,
    icon: "fa-solid fa-palette"
  },
];

export   const moods = [
    { emoji: "😡", label: "Poor" },
    { emoji: "😕", label: "Fair" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😍", label: "Great" },
    { emoji: "🤩", label: "Amazing" },
  ];
    