update matrimony.cms_pages
set content = regexp_replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(content::text,
                      'Single Asian Parents (SAP) is a distinguished app designed for single Asian parents',
                      'Ma''aak is a distinguished app designed for single parents'),
                    'All SAP members', 'All Ma''aak members'),
                  'SAP’s', 'Ma''aak’s'),
                'Single Asian Parents.', ''),
              'singleap.com', 'maaak.co.uk'),
            'Single Asian Parents (SAP)', 'Ma''aak'),
          'SingleAP', 'Ma''aak'),
        'Single Asian Parents', 'Ma''aak'),
      'single Asian parents', 'single parents'),
    '/#about-sap', '/#about-maaak'),
  '\mSAP\M', 'Ma''aak', 'g')::jsonb
where content::text ~ 'SingleAP|Single Asian Parents|\mSAP\M|about-sap';
