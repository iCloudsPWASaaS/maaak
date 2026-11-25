update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "banner": {
      "queries": [
        "elegant muslim wedding couple portrait",
        "halal matrimony couple happy",
        "islamic nikah couple portrait"
      ],
      "useSerpApi": false,
      "autoPlay": true,
      "intervalMs": 6000,
      "maxImages": 3,
      "fallbackImage": "/images/mock1.png",
      "alt": "Elegant Muslim wedding couple",
      "revalidateSeconds": 3600,
      "images": [
        {
          "imageUrl": "https://s3.cinewood.co.uk/matrimony/cms/banners/maaak-hero-1.jpg",
          "alt": "Elegant Muslim wedding couple by the window",
          "query": "MAAAK curated hero"
        },
        {
          "imageUrl": "https://s3.cinewood.co.uk/matrimony/cms/banners/maaak-hero-2.jpg",
          "alt": "Muslim wedding couple in formal attire",
          "query": "MAAAK curated hero"
        },
        {
          "imageUrl": "https://s3.cinewood.co.uk/matrimony/cms/banners/maaak-hero-3.jpg",
          "alt": "Joyful Muslim wedding celebration",
          "query": "MAAAK curated hero"
        }
      ],
      "overlay": {
        "show": true,
        "eyebrow": "Halal Matrimony",
        "title": "A Love Story Built on Faith",
        "subtitle": "Meet verified, like-minded Muslim singles who value family, faith, and forever.",
        "buttonText": "Find Your Match",
        "buttonHref": "/register"
      }
    }
  }'::jsonb
where slug = 'home';
