update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "getApp": {
      "title": "Get Our App",
      "body": "Get our app on the Google Play Store or Apple App Store for a smooth on-the-go experience. Stay connected, stay informed, and access the best of our services right at your fingertips"
    },
    "about": {
      "title": "Ma''aak",
      "subtitle": "For Parents, By Parents",
      "body": "Become a member and search for your own unique love story!"
    },
    "aboutCopy": {
      "intro": "Ma''aak is a distinguished app designed for single Asian parents seeking meaningful connections. It offers a secure environment for individuals to engage with others who share similar experiences and values.",
      "points": [
        "Connect with individuals who understand your journey.",
        "Experience a supportive community that honors your unique path.",
        "Easily find matches based on location, interests, and parenting style."
      ],
      "closing": "If you are not a parent, you are also welcome. Whether you are widowed, divorced, or single, we embrace all individuals and respect each person’s unique journey. Join us today and discover the possibilities!"
    },
    "steps": [
      {
        "title": "Create",
        "description": "Register for free and start searching.",
        "desktopDescription": "Register for free and start\nsearching.",
        "icon": "/images/icon-user-create.png"
      },
      {
        "title": "Connect",
        "description": "AI-BASED algorithm to connect profiles.",
        "desktopDescription": "AI-BASED algorithm to connect\nprofiles.",
        "icon": "/images/icon-user-connect.png"
      },
      {
        "title": "Communicate",
        "description": "Free messenger, videos and voice calling.",
        "desktopDescription": "Free messenger, videos and\nvoice calling.",
        "icon": "/images/icon-user-communication.png"
      }
    ],
    "safetyRules": [
      {"label": "No Nudity:", "text": "Explicit or nude photos are strictly prohibited."},
      {"label": "No Screenshots:", "text": "Screenshots are disabled to protect privacy."},
      {"label": "Limited Chats:", "text": "Users can chat with a maximum of 3 people at a time."},
      {"label": "ID Verification:", "text": "All users must complete identity verification."},
      {"label": "Location Restriction:", "text": "Access is limited to users within the postcode provided."}
    ],
    "verified": {
      "title": "Checked, Verified & Trusted",
      "body": "Your Safety is important! All Ma''aak members are approved through our secure Passport or Driver''s License checks."
    },
    "visibility": {
      "title": "Profile Visibility",
      "body": "Crafting an exceptional online matrimonial profile involves showcasing your personality and partner preferences in a compelling way. By using our Preference Filters, you can fine-tune your search based on criteria like Ethnicity, Location, Education, Age, and more, which will enhance your chances of finding your ideal partner."
    },
    "calling": {
      "title": "Free Video",
      "subtitle": "Calling",
      "body": "Video calls offer a secure way to connect and get to know each other before meeting face-to-face.",
      "button": "Visit our Safety Centre",
      "href": "#community-guidline"
    },
    "features": [
      {"text": "Discover single parents\nin your area.", "icon": "/images/icon-location.png"},
      {"text": "Singles showcasing their authentic selves through comprehensive profiles.", "icon": "/images/icon-ai-based.png"},
      {"text": "AI-driven algorithm to match profiles based on user preferences.", "icon": "/images/icon-profile-detailed.png"},
      {"text": "Voice and Video\nCall", "icon": "/images/icon-video-chat.png"}
    ],
    "guidelines": {
      "title": "Ma''aak’s Behaviour & Community Guidelines",
      "href": "/faq"
    }
  }'::jsonb,
  updated_at = now()
where slug = 'home';

update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "copyright": "© 2026 Ma''aak. All Rights Reserved.",
    "columns": [
      {
        "title": "Company",
        "links": [
          {"label": "About us", "href": "/#about-maaak"}
        ]
      },
      {
        "title": "Help & Support",
        "links": [
          {"label": "Behaviour & Guidelines", "href": "/faq"},
          {"label": "Safety Guidelines", "href": "/safety-guideline"},
          {"label": "Safety Resources", "href": "/safety-resources"},
          {"label": "Contact", "href": "/contact"}
        ]
      },
      {
        "title": "Legal",
        "links": [
          {"label": "Terms & Conditions", "href": "/terms"},
          {"label": "Privacy Policy", "href": "/privacy"},
          {"label": "Children Privacy Policy", "href": "/children-privacy-policy"},
          {"label": "Account Deletion Policy", "href": "/account-deletion-policy"},
          {"label": "Cookies", "href": "/cookie-policy"}
        ]
      },
      {
        "title": "Product",
        "links": [
          {"label": "Sign Up", "href": "/register"}
        ]
      }
    ]
  }'::jsonb,
  updated_at = now()
where slug = 'footer';
