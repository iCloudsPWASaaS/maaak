update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "banner": {
      "queries": [
        "muslim matrimonial couple wedding",
        "halal matrimony couple happy",
        "islamic wedding couple portrait"
      ],
      "useSerpApi": true,
      "autoPlay": true,
      "intervalMs": 5000,
      "maxImages": 5,
      "fallbackImage": "/images/mock1.png",
      "alt": "Muslim matrimonial couple banner",
      "revalidateSeconds": 3600
    }
  }'::jsonb
where slug = 'home';
