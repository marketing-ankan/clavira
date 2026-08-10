<?php

// Bulk photo ingest — the endpoint n8n talks to when it walks an unzipped
// Synology folder.
//
// This is a machine-to-machine door into the catalogue, so it is OFF unless
// INGEST_TOKEN is set. There is no "allow when unconfigured" path anywhere in
// the controller: an empty token means 503, never open.

return [

    /*
    |--------------------------------------------------------------------------
    | Shared secret
    |--------------------------------------------------------------------------
    | Sent by n8n as the X-Ingest-Token header and compared with hash_equals.
    | Generate with:  php -r "echo bin2hex(random_bytes(32));"
    */
    'token' => env('INGEST_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | Where ingested originals land
    |--------------------------------------------------------------------------
    | Under public/, mirroring how ProductAdminController already stores admin
    | uploads, so nothing else in the app needs to learn a second convention.
    | One subfolder per SKU keeps a 10,000-file import off a single directory
    | listing — ext4 and NTFS both degrade badly past a few thousand entries.
    */
    'path' => 'images/catalog/ingest',

    /*
    |--------------------------------------------------------------------------
    | Accepted files
    |--------------------------------------------------------------------------
    */
    'extensions' => ['jpg', 'jpeg', 'png', 'webp'],
    'max_kb' => 20480,          // per file; must also fit PHP upload_max_filesize
    'max_manifest' => 500,      // files per /plan call — keeps the SQL IN() sane

    /*
    |--------------------------------------------------------------------------
    | Filename -> SKU / frame / view
    |--------------------------------------------------------------------------
    | Matched against the file's path RELATIVE to the extract root, with the
    | extension already stripped and backslashes normalised to '/'.
    |
    | Every pattern that matches produces a CANDIDATE reading, and the order
    | below is the order they are tried — but the winner is the first candidate
    | whose SKU actually exists in the catalogue. That matters because plenty of
    | real filenames are ambiguous and no regex can settle them alone:
    |
    |     CLV-1234.jpg     is that SKU "CLV-1234"?  or SKU "CLV" frame 1234?
    |     CLV1234-007.jpg  SKU "CLV1234" frame 7?   or SKU "CLV1234-007"?
    |
    | Both readings are generated; the products table breaks the tie. A pattern
    | list alone would have to guess, and would be wrong for half the catalogue.
    |
    | Named groups, all optional except `sku`:
    |   sku    matched against products.sku (tolerantly — see resolveSkus)
    |   frame  turntable frame / shot number, drives sort_order
    |   view   angle label: front, side, top, back, detail, model, ...
    |
    | Adjust these to your photographer's actual convention rather than renaming
    | ten thousand files. Run `php artisan photos:ingest <folder> --dry` to see
    | how a real folder parses before importing anything.
    */
    'patterns' => [
        // The CAD supplier's lot convention, e.g.
        //   LBR/588/588-01@R-#viwe2.png       design 588, ROSE gold, view 2
        //   LBR/25-CAD/25-CAD-01@Y-#viwe4.png design 25-CAD, YELLOW, view 4
        //
        // '@R/@W/@Y' is the metal the design was rendered in, so each design
        // arrives as 3 metals x 4 views. It is captured as `view` (normalised
        // to rose/white/yellow below) and the trailing #viwe number as `frame`.
        // Listed first because it is the most specific shape here — the
        // generic patterns would otherwise read the whole stem as a SKU.
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*?)-\d+@(?<view>[RWY])-\#viwe(?<frame>\d{1,3})$#i',

        // Same lot, the extra detail shots that sit beside the CAD:
        //   LBR/25-CAD/25-CAD/25@6.png
        // The stem ("25") is an abbreviation of the design, not the design id,
        // so the SKU is taken from the enclosing folder instead.
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*)/[^/]*@(?<frame>\d{1,3})$#',

        // Folder per SKU — the shape a turntable shoot almost always arrives
        // in. The SKU is the LAST folder, so wrapper folders ("Rings/", the
        // date, the photographer's name) don't hijack the match.
        //   .../CLV-1234/007.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*)/(?<frame>\d{1,4})$#',
        //   .../CLV-1234/front.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*)/(?<view>[A-Za-z]+)$#',

        // Explicit and unambiguous, so it outranks the bare name.
        //   CLV-1234_frame07.jpg / CLV-1234-frame-7.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*?)[_-]frame[_-]?(?<frame>\d{1,4})$#i',

        // A known angle word is a strong signal it is not part of the SKU.
        //   CLV-1234_front.jpg / CLV-1234-detail.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*?)[_-](?<view>front|back|side|top|bottom|angle|detail|model|closeup|macro)$#i',

        // The whole filename as the SKU. Ranked ABOVE the numeric split so a
        // catalogued "CLV-1234" wins over reading it as "CLV" + frame 1234.
        //   CLV-1234.jpg / CLV.22K.114.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*)$#',

        // Last resort: trailing digits are a frame number. Only reached when
        // the full name is not a known SKU.
        //   CLV-1234_07.jpg / CLV1234-007.jpg
        '#(?:^|/)(?<sku>[A-Za-z0-9][A-Za-z0-9._-]*?)[_-](?<frame>\d{1,4})$#',
    ],

    /*
    |--------------------------------------------------------------------------
    | Create products for SKUs that aren't in the catalogue yet?
    |--------------------------------------------------------------------------
    | Deliberately false. A photo folder is not a source of truth for price,
    | category or name, and a run that silently invents 300 empty products is
    | far more work to clean up than a report saying which SKUs are missing.
    */
    'create_missing_products' => false,
];
