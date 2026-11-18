update matrimony.cms_pages
set
  content = coalesce(content, '{}'::jsonb) || '{
    "banner": {
      "query": "single parent matrimony couple",
      "useSerpApi": true,
      "fallbackImage": "/images/mock1.png",
      "alt": "Ma''aak matrimony banner",
      "revalidateSeconds": 3600
    }
  }'::jsonb
where slug = 'home';
