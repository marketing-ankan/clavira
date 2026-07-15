<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Clavira — Fine Jewellery | BIS Hallmarked · IGI Certified</title>
    <meta name="description" content="Clavira fine jewellery — lab-grown IGI-certified diamonds and Jadau Kundan heritage in BIS-hallmarked gold. Zero deductions on gold exchange, 98% gold value return.">
    <link rel="icon" type="image/png" href="/images/brand/favicon.png">
    <link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">
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
