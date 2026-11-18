update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "banner": {
      "queries": [
        "muslim wedding couple elegant portrait",
        "halal matrimony couple happy",
        "islamic nikah couple portrait"
      ],
      "useSerpApi": true,
      "autoPlay": true,
      "intervalMs": 5500,
      "maxImages": 5,
      "fallbackImage": "/images/mock1.png",
      "alt": "Muslim matrimony couple banner",
      "revalidateSeconds": 3600,
      "overlay": {
        "show": true,
        "title": "Find Your Perfect Match",
        "subtitle": "A trusted matrimony community for Muslim single parents.",
        "buttonText": "Create Your Profile",
        "buttonHref": "/register"
      }
    }
  }'::jsonb
where slug = 'home';
