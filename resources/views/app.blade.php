<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @php
        $claviraConfig = [
            'whatsapp' => config('clavira.whatsapp'),
            'phone' => config('clavira.phone'),
            'email' => config('clavira.email'),
            'instagram' => config('clavira.instagram'),
            'countries' => \App\Support\Countries::forSelect(),
            // Indicative FX (units per INR) for the NRI display layer; charging
            // stays in INR. Empty until the first clavira:fx-fetch succeeds.
            'fx' => \App\Models\FxRate::published(),
            'gst_rate' => (float) config('clavira.gst_rate', 0.03),
            // Virtual try-on: only the pieces with a prepared transparent cutout.
            'tryon' => config('tryon.enabled') ? [
                'model_url' => config('tryon.model_url'),
                'hand_model_url' => config('tryon.hand_model_url'),
                'wasm_path' => config('tryon.wasm_path'),
                'pieces' => config('tryon.pieces'),
            ] : null,
            // Tag IDs only — no vendor script loads until consent is given.
            'ga4' => config('analytics.ga4'),
            'meta_pixel' => config('analytics.meta_pixel'),
            'consent_ttl_months' => config('analytics.consent_ttl_months'),
        ];
        // Server-rendered SEO for a client-rendered site: without this every URL
        // served crawlers the same title, description and (absent) image.
        $seo = $seo ?? \App\Support\Seo::forPath('');
    @endphp
    <script>
        window.__CLAVIRA = {!! json_encode($claviraConfig) !!};
    </script>

    <title>{{ $seo['title'] }}</title>
    <meta name="description" content="{{ $seo['description'] }}">
    <meta name="robots" content="{{ $seo['robots'] }}">
    <link rel="canonical" href="{{ $seo['canonical'] }}">

    <meta property="og:site_name" content="Clavira">
    <meta property="og:type" content="{{ $seo['type'] }}">
    <meta property="og:title" content="{{ $seo['title'] }}">
    <meta property="og:description" content="{{ $seo['description'] }}">
    <meta property="og:url" content="{{ $seo['canonical'] }}">
    <meta property="og:locale" content="en_IN">
    @if ($seo['image'])
        <meta property="og:image" content="{{ $seo['image'] }}">
        <meta property="og:image:alt" content="{{ $seo['title'] }}">
    @endif

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $seo['title'] }}">
    <meta name="twitter:description" content="{{ $seo['description'] }}">
    @if ($seo['image'])
        <meta name="twitter:image" content="{{ $seo['image'] }}">
    @endif

    @foreach ($seo['jsonld'] as $block)
        <script type="application/ld+json">{!! json_encode($block, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
    @endforeach

    <link rel="icon" type="image/png" href="/images/brand/favicon.png">
    <link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#b08d57">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Clavira">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
    <script src="https://checkout.razorpay.com/v1/checkout.js" defer></script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
</head>
<body>
    <div id="root"></div>
</body>
</html>
