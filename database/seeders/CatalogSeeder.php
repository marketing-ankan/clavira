<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Certificate;
use App\Models\Collection;
use App\Models\GoldRate;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    private const IMG = 'images/catalog/';

    public function run(): void
    {
        $this->seedGoldRate();
        $categories = $this->seedCategories();
        $collections = $this->seedCollections();
        $this->seedProducts($categories, $collections);
    }

    private function seedGoldRate(): void
    {
        $r24 = (float) env('GOLD_RATE_MANUAL_24K', 7450);
        GoldRate::create([
            'rate_24k' => $r24,
            'rate_22k' => round($r24 * 0.916, 2),
            'rate_18k' => round($r24 * 0.750, 2),
            'rate_14k' => round($r24 * 0.585, 2),
            'source' => 'manual',
            'effective_at' => now(),
        ]);
    }

    /** @return array<string,Category> */
    private function seedCategories(): array
    {
        $rows = [
            ['Rings', 'rings', 'Solitaires, bands & Jadau artistry', 'p04_00.jpg'],
            ['Earrings', 'earrings', 'Chandeliers, studs & heirloom jhumkas', 'p10_07.jpg'],
            ['Bracelets', 'bracelets', 'Tennis, cuffs & Jadau refinement', 'p16_07.jpg'],
            ['Bangles', 'bangles', 'Kundan, gold & diamond radiance', 'p18_03.jpg'],
            ['Necklaces', 'necklaces', 'Layered, statement & signature sets', 'p41_03.jpg'],
            ['Pendants', 'pendants', 'Solitaires, drops & Kundan grace', 'p33_09.jpg'],
            ['Pendant Sets', 'pendant-sets', 'Perfectly paired ensembles', 'p36_07.jpg'],
        ];
        $out = [];
        foreach ($rows as $i => [$name, $slug, $tag, $img]) {
            $out[$slug] = Category::create([
                'name' => $name, 'slug' => $slug, 'tagline' => $tag,
                'hero_image' => self::IMG.$img, 'sort_order' => $i,
            ]);
        }

        return $out;
    }

    /** @return array<string,Collection> */
    private function seedCollections(): array
    {
        $rows = [
            ['The Diamond Bridal Edit', 'bridal-edit', 'Special Collection', 'Ten IGI-certified pieces for the modern Indian bride.', 'Every piece crafted to make the moment eternal — from brow to fingertip.', 'p40_00.jpg'],
            ['The Solitaire Diamond Edit', 'solitaire-edit', 'Solitaire Collection', 'Perfect stones. Perfect settings. Each IGI certified.', 'Each piece begins with a diamond chosen for exceptional character, then refined through IGI certification and set with exacting craftsmanship.', 'p48_00.jpg'],
            ['The Heritage Kundan Edit', 'heritage-kundan-edit', 'Special Collection', 'Uncut masterpieces — polki diamonds, hand-set in 18kt gold.', 'Rooted in Rajputana heritage, Jadau is the art of setting uncut stones into gold with exquisite precision, finished with the luminous grace of Kundan work.', 'p42_01.jpg'],
            ['The NRI Fusion Edit', 'nri-fusion-edit', 'NRI Collection', 'Pieces that speak both languages — heritage and contemporary.', 'Lightweight, versatile, and travel-ready — jewels that transition from boardroom to ballroom. Fully insured shipping to over 50 countries.', 'd2-earring-03.jpg'],
            ['The Mangalsutra & Maang Tikka Edit', 'mangalsutra-edit', 'Special Collection', 'Celebrating the sacred adornments of an Indian bride.', 'The sacred bond, reimagined — IGI-certified solitaires on classic black bead chains.', 'p58_01.jpg'],
            ['The Kundan Pendant Set Edit', 'kundan-pendant-set-edit', 'Special Collection', 'Heirloom-quality sets, each a celebration of Indian artistry.', 'Crafted in 18kt gold with hand-set Kundan work, featuring large, vivid gemstones — rubies, emeralds, sapphires, turquoise and pearls.', 'p42_07.jpg'],
            ['The Necklace Grand Edit', 'necklace-grand-edit', 'Special Collection', 'Statement necklaces — for moments that demand more.', 'A neckline transformed. Layered, statement and signature sets in diamond and polki.', 'p45_01.jpg'],
            ['The Gold & Diamond Mixed Edit', 'gold-diamond-mixed-edit', 'Special Collection', 'Pieces where gold and diamonds find perfect harmony.', 'Iconic silhouettes that pair the warmth of gold with the fire of diamonds.', 'p60_08.jpg'],
            ['The Marigold Ring Edit', 'marigold-ring-edit', 'Special Collection', 'Expressions of gold, each a distinct bloom.', 'Golden rings inspired by the marigold — auspicious, radiant, unmistakably Indian.', 'p60_04.jpg'],
            ['The Golden Bangle & Bracelet Edit', 'golden-bangle-edit', 'Special Collection', 'Iconic silhouettes — one for every occasion.', 'Layer. Luxuriate. Rule. Mix 18kt gold, diamond and Jadau Kundan bangles for a wrist adorned in legacy.', 'p22_00.jpg'],
        ];
        $out = [];
        foreach ($rows as $i => [$name, $slug, $badge, $subtitle, $desc, $img]) {
            $out[$slug] = Collection::create([
                'name' => $name, 'slug' => $slug, 'badge' => $badge, 'subtitle' => $subtitle,
                'description' => $desc, 'hero_image' => self::IMG.$img, 'sort_order' => $i,
            ]);
        }

        return $out;
    }

    private function seedProducts(array $cats, array $cols): void
    {
        // [category, name, price, description, diamond_type, quality, metal, purity, jadau, igi, featured, images[], collections[]]
        $data = [
            // ---------------- RINGS ----------------
            ['rings', 'Lumière Solitaire', 195000, '18kt white gold · Brilliant-cut diamond · Sculpted for luminous elegance', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, true, ['p48_00.jpg', 'p06_03.jpg'], ['solitaire-edit']],
            ['rings', 'Eternity Band Trilogy Rose', 88000, '18kt rose gold · Round diamonds · Channel set · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p04_05.jpg'], []],
            ['rings', 'Pear Drop Halo Cocktail Ring', 145000, '18kt white gold · Pear diamond · Halo brilliance with refined grace', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p60_13.jpg'], []],
            ['rings', 'Navratna Diamond Ring', 165000, '18kt gold · Nine precious stones · Diamond border', 'natural', 'VVS', 'yellow', 18, false, true, false, ['p06_05.jpg'], []],
            ['rings', 'Meenakari Polki Ring', 120000, '18kt gold · Polki diamonds · Enamel peacock motif', 'polki', 'Uncut polki', 'yellow', 18, true, false, false, ['p60_03.jpg'], ['heritage-kundan-edit']],
            ['rings', 'Rani Kundan Ring', 135000, '18kt gold · Polki diamonds · Emerald · Jadau Kundan', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p60_04.jpg'], ['heritage-kundan-edit']],
            ['rings', 'Marquise Illusion Ring', 76000, '18kt white gold · Marquise diamond · Illusion setting · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p48_06.jpg'], ['solitaire-edit']],
            ['rings', 'Cushion Halo Ring', 98000, '18kt gold · Cushion cut · Double halo · VVS clarity', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p06_06.jpg'], ['solitaire-edit']],
            ['rings', 'Emerald Cut Solitaire', 210000, '14kt white gold · Emerald cut · Step facets · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 14, false, true, false, ['p06_02.jpg'], ['solitaire-edit']],
            ['rings', 'Baguette Band', 65000, '18kt gold · Baguette diamonds · Channel set · E–F colour', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p06_01.jpg'], []],
            ['rings', 'Princess Cut Ring', 172000, '18kt white gold · Princess cut · Four-prong · E colour', 'lab_grown', 'VVS · E', 'white', 18, false, true, false, ['p48_01.jpg'], ['solitaire-edit']],
            ['rings', 'Oval Lab Grown Ring', 89000, '18kt rose gold · Oval diamond · Lab grown band · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p48_02.jpg'], ['solitaire-edit', 'nri-fusion-edit']],
            ['rings', 'Radiant Halo Ring', 112000, '18kt gold · Radiant cut · Micro pavé halo · IGI certified', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p48_08.jpg'], ['solitaire-edit']],
            ['rings', 'Lab-Grown Classic Solitaire', 68000, '14kt white gold · Round brilliant · Lab-grown · VVS · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 14, false, true, false, ['p48_03.jpg'], ['solitaire-edit']],
            ['rings', 'Emerald & Diamond Cocktail Ring', 158000, '18kt gold · Emerald and diamond sparkle · Bold, celebratory, unforgettable', 'natural', 'VVS', 'yellow', 18, false, true, false, ['p06_07.jpg'], ['gold-diamond-mixed-edit']],
            ['rings', 'Marquise Floral Cluster Ring', 84000, '18kt gold · Marquise diamonds · Floral arrangement', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p06_09.jpg'], []],
            ['rings', 'Marigold Bloom Ring', 52000, '22kt gold · Sculpted marigold motif · A distinct bloom in pure gold', 'none', null, 'yellow', 22, false, false, false, ['p04_04.jpg'], ['marigold-ring-edit']],
            ['rings', 'Rose Swirl Statement Ring', 92000, '18kt rose gold · Pavé swirl · Statement silhouette', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p04_00.jpg'], ['marigold-ring-edit']],
            ['rings', 'Emerald-Cut Cocktail Ring', 175000, '18kt rose gold · Emerald-cut centre · Pavé shoulders', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p03_00.jpg'], ['gold-diamond-mixed-edit']],
            ['rings', 'Leaf Pavé Ring', 71000, '18kt gold · Leaf pavé motif · Everyday luxury', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p60_08.jpg'], ['gold-diamond-mixed-edit', 'nri-fusion-edit']],
            ['rings', 'Toi et Moi Twin-Stone Ring', 99000, '18kt gold · Two-stone open design · Marquise and emerald cuts', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p60_07.jpg', 'p60_01.jpg'], ['gold-diamond-mixed-edit', 'nri-fusion-edit']],
            ['rings', 'Wing Ring', 58000, '18kt gold · Sculpted wing pavé · Light as air', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p32_10.jpg'], ['marigold-ring-edit']],

            // ---------------- EARRINGS ----------------
            ['earrings', 'Diamond Chandelier Earrings', 185000, '18kt white gold · Cascading chandelier drops · Designed to catch the light and move with effortless grace', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, true, ['p10_07.jpg'], ['bridal-edit']],
            ['earrings', 'Round Cluster Studs', 48000, '18kt gold · Round brilliant cluster · VVS · IGI certified', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p09_05.jpg'], []],
            ['earrings', 'Pear Drop Dangles', 96000, '18kt white gold · Pear diamond drops · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p52_06.jpg'], ['nri-fusion-edit']],
            ['earrings', 'Peacock Emerald Drops', 145000, '18kt gold · Emerald drops · Peacock motif · Jadau craftsmanship', 'polki', 'Uncut polki', 'yellow', 18, true, false, false, ['p36_03.jpg'], ['heritage-kundan-edit']],
            ['earrings', 'Ruby Meenakari Kundan Drops', 128000, '18kt gold · Ruby · Polki diamonds · Meenakari enamel', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_05.jpg'], ['heritage-kundan-edit']],
            ['earrings', 'Jhumka & Drop Duo', 88000, '18kt gold · Iconic jhumka silhouette · Diamond-studded drops', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p29_02.jpg'], []],

            // ---------------- BRACELETS ----------------
            ['bracelets', 'Diamond Tennis Bracelet', 225000, '18kt white gold · Round brilliant · Channel set · VVS · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, true, ['p16_06.jpg'], ['bridal-edit']],
            ['bracelets', 'Baguette Line Bracelet', 165000, '18kt white gold · Baguette diamonds · Bar set', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p16_07.jpg'], []],
            ['bracelets', 'Lab-Grown Tennis Bracelet', 118000, '14kt white gold · Lab-grown diamonds · Prong set · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 14, false, true, false, ['p19_04.jpg'], ['nri-fusion-edit']],
            ['bracelets', 'Oval Diamond Station Bracelet', 138000, '18kt gold · Oval diamonds · Bezel set · IGI certified', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p19_01.jpg'], []],
            ['bracelets', 'Jadau Polki Cuff', 285000, '18kt gold · Uncut polki · Kundan setting · Regal warmth', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p19_02.jpg'], ['heritage-kundan-edit']],
            ['bracelets', 'Rose Pavé Bangle Bracelet', 96000, '18kt rose gold · Micro pavé diamonds · Modern cuff', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p19_00.jpg'], ['golden-bangle-edit']],
            ['bracelets', 'Floral Station Bracelet', 87000, '18kt rose gold · Floral motif links · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p22_03.jpg'], []],
            ['bracelets', 'Trillion Solitaire Bangle', 155000, '18kt gold · Trillion diamond · Bezel-set solitaire cuff', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p48_09.jpg'], []],
            ['bracelets', 'Marquise Vine Bangle', 132000, '18kt rose gold · Marquise diamonds · Vine motif', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p55_07.jpg'], []],
            ['bracelets', 'Wave Cuff', 90000, '18kt rose gold · Wave silhouette · Baguette centre', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p24_05.jpg'], ['golden-bangle-edit']],
            ['bracelets', 'Paperclip Diamond Bracelet', 74000, '18kt gold · Paperclip links · Station diamonds', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p22_08.jpg'], ['nri-fusion-edit']],
            ['bracelets', 'Crossover Bangle Bracelet', 89000, '18kt rose gold · Crossover pavé · Modern geometry', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p20_03.jpg'], ['nri-fusion-edit']],

            // ---------------- BANGLES ----------------
            ['bangles', 'Diamond Eternity Bangle Pair', 385000, 'Set of two · 18kt white gold · Full diamond set · VVS · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p18_01.jpg'], ['bridal-edit']],
            ['bangles', 'Jadau Polki Bangle Set', 520000, 'Set of four · 18kt gold · Uncut polki diamonds · Kundan setting · Meenakari enamel', 'polki', 'Uncut polki', 'yellow', 22, true, false, true, ['p18_03.jpg'], ['bridal-edit', 'heritage-kundan-edit']],
            ['bangles', 'Ruby Heritage Kada Pair', 465000, '18kt gold · Ruby cabochons · Polki diamond border · Jadau', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p18_00.jpg'], ['bridal-edit', 'heritage-kundan-edit']],
            ['bangles', 'Emerald Garden Bangle Set', 445000, '18kt gold · Emerald florets · Polki accents · Jadau setting', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p27_00.jpg'], ['heritage-kundan-edit']],
            ['bangles', 'Filigree Diamond Bangle Pair', 298000, '18kt rose gold · Openwork filigree · Pavé diamonds', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p18_05.jpg'], ['golden-bangle-edit']],
            ['bangles', 'Rose Pavé Bangle', 112000, '18kt rose gold · Full pavé · Slim stacking profile', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p18_04.jpg'], []],
            ['bangles', 'Marigold Gold Kada Pair', 265000, '22kt gold · Floral repoussé work · The golden edit', 'none', null, 'yellow', 22, false, false, false, ['p18_07.jpg'], ['marigold-ring-edit', 'golden-bangle-edit']],
            ['bangles', 'Twist Pavé Bangle Pair', 235000, '18kt gold · Twisted pavé rows · Sculptural stack', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p28_06.jpg'], ['golden-bangle-edit']],
            ['bangles', 'Ruby Pear Bangle Pair', 320000, '18kt gold · Pear rubies · Polki diamond frame · Jadau', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p28_04.jpg'], []],
            ['bangles', 'Rose Trio Stack', 145000, 'Set of three · 18kt rose gold · Alternating pavé and polish', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p22_00.jpg'], ['golden-bangle-edit']],
            ['bangles', 'Marquise Eternity Bangle', 190000, '18kt rose gold · Marquise diamonds · Full eternity', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p22_07.jpg'], ['gold-diamond-mixed-edit']],
            ['bangles', 'Amethyst Royale Kada', 178000, '18kt gold · Amethyst ovals · Diamond lattice', 'natural', 'VVS', 'yellow', 18, false, true, false, ['p27_07.jpg'], []],

            // ---------------- NECKLACES ----------------
            ['necklaces', 'Diamond Rivière Necklace', 425000, '18kt white gold · Graduated diamonds · Prong set · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p44_08.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Diamond Choker', 385000, '18kt white gold · Round brilliant · VVS · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p41_00.jpg'], ['bridal-edit']],
            ['necklaces', 'Fringe Cascade Necklace', 465000, '18kt gold · Graduated fringe drops · A neckline transformed', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p41_03.jpg'], ['bridal-edit', 'necklace-grand-edit']],
            ['necklaces', 'Emerald Grand Necklace', 1250000, '18kt gold · Emerald cabochons · Multi-row diamond cascade · For moments that demand more', 'natural', 'VVS', 'yellow', 18, false, true, true, ['p26_00.jpg'], ['bridal-edit', 'necklace-grand-edit']],
            ['necklaces', 'Three-Row Emerald Rivière', 890000, '18kt rose gold · Three graduated rows · Emerald stations', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p47_01.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Sapphire Collar', 720000, '18kt white gold · Blue sapphires · Diamond halo links', 'natural', 'VVS', 'white', 18, false, true, false, ['p61_00.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Scalloped Rose Necklace', 340000, '18kt rose gold · Scalloped pavé arcs · Signature set', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p29_01.jpg'], []],
            ['necklaces', 'Chandelier Fringe Necklace', 560000, '18kt white gold · Chandelier fringe · Statement brilliance', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p45_01.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Kundan Ruby Choker', 680000, '18kt gold · Polki diamonds · Central rubies · Kundan setting', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p44_00.jpg'], ['bridal-edit', 'heritage-kundan-edit']],
            ['necklaces', 'Rania Grand Kundan Necklace', 950000, '18kt gold · Multi-gem · Polki halo · The grandeur of Kundan', 'polki', 'Uncut polki', 'yellow', 22, true, false, true, ['p42_01.jpg'], ['bridal-edit', 'heritage-kundan-edit']],
            ['necklaces', 'Lotus Pendant Necklace', 165000, '18kt gold · Lotus drop pendant · Ruby accents', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p44_07.jpg'], []],
            ['necklaces', 'Layered Y-Drop Necklace', 210000, '18kt rose gold · Layered chains · Floral Y-drop', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p43_05.jpg'], ['nri-fusion-edit']],
            ['necklaces', 'Three-Row Station Necklace', 385000, '18kt white gold · Three graduated rows · Cluster stations', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p43_04.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Paisley Fan Necklace', 455000, '18kt rose gold · Paisley fan links · Heritage silhouette, modern setting', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p44_03.jpg'], ['necklace-grand-edit']],
            ['necklaces', 'Diamond Solitaire Mangalsutra', 96000, '18kt gold · IGI solitaire · Black bead chain · The sacred bond, reimagined', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p33_06.jpg'], ['mangalsutra-edit']],
            ['necklaces', 'Rose Gold Heart Mangalsutra', 78000, '18kt rose gold · Heart pavé pendant · Lab-grown · Slim black bead chain', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p33_02.jpg'], ['mangalsutra-edit', 'nri-fusion-edit']],
            ['necklaces', 'Floral Bloom Necklace', 265000, '18kt rose gold · Blooming floral pendant · Pavé petals', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p43_01.jpg'], ['gold-diamond-mixed-edit']],
            ['necklaces', 'Mesh Collar Necklace', 495000, '18kt rose gold · Diamond mesh collar · Whispers of royalty', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p46_00.jpg'], ['necklace-grand-edit']],

            // ---------------- PENDANTS ----------------
            ['pendants', 'Pear Solitaire Drop', 72000, '18kt gold · Pear halo solitaire · IGI certified · Delicate gold chain included', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, true, ['p33_09.jpg', 'p33_01.jpg'], ['solitaire-edit']],
            ['pendants', 'Lab Grown Heart Pendant', 58000, '18kt rose gold · Pavé heart · Lab-grown · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p33_02.jpg'], []],
            ['pendants', 'Marquise Bezel Pendant', 49000, '18kt gold · Marquise cut · Bezel set · E–F colour', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p33_04.jpg'], ['nri-fusion-edit']],
            ['pendants', 'Oval Halo Pendant', 66000, '18kt rose gold · Oval diamond · Halo setting · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p33_03.jpg'], ['solitaire-edit']],
            ['pendants', 'Round Solitaire Pendant', 61000, '18kt rose gold · Round brilliant · Four-prong · IGI certified', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p33_00.jpg'], ['solitaire-edit']],
            ['pendants', 'Emerald-Cut Pendant', 85000, '18kt white gold · Emerald cut · Step facets · IGI certified', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p33_07.jpg'], []],
            ['pendants', 'Hexagon Illusion Pendant', 54000, '18kt gold · Hexagonal illusion setting · Baguette mosaic', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p33_05.jpg'], []],
            ['pendants', 'Sunset Trillion Pendant', 92000, '18kt gold · Trillion orange sapphire · Diamond halo', 'natural', 'VVS', 'yellow', 18, false, true, false, ['p33_08.jpg'], ['gold-diamond-mixed-edit']],
            ['pendants', 'Emerald Halo Pendant', 98000, '18kt white gold · Pear emerald · Double diamond halo', 'natural', 'VVS', 'white', 18, false, true, false, ['p03_07.jpg'], []],
            ['pendants', 'Peacock Kundan Pendant', 135000, '18kt gold · Polki · Meenakari peacock · Pearl fringe', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p07_00.jpg'], ['heritage-kundan-edit']],
            ['pendants', 'Turquoise Kundan Pendant', 88000, '18kt gold · Turquoise cabochons · Kundan work', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_03.jpg'], ['kundan-pendant-set-edit']],
            ['pendants', 'Leaf Pavé Pendant', 47000, '18kt white gold · Cascading leaf pavé · Everyday brilliance', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p37_00.jpg'], []],

            // ---------------- PENDANT SETS ----------------
            ['pendant-sets', 'Solitaire Duo Set', 158000, 'Pendant + studs · 18kt gold · IGI VVS · E–F colour · Luxury box presentation', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, true, ['p34_00.jpg'], ['solitaire-edit']],
            ['pendant-sets', 'Peacock Jadau Set', 245000, 'Pendant + earrings · 18kt gold · Peacock motif · Emerald drops', 'polki', 'Uncut polki', 'yellow', 18, true, false, false, ['p35_03.jpg'], ['kundan-pendant-set-edit']],
            ['pendant-sets', 'Heart Pendant Set', 96000, 'Pendant + drops · 18kt gold · Heart silhouette · Lab-grown', 'lab_grown', 'VVS · E–F', 'yellow', 18, false, true, false, ['p35_09.jpg', 'p35_14.jpg'], ['nri-fusion-edit']],
            ['pendant-sets', 'Velvet Rouge Set', 185000, 'Pendant + earrings · 18kt rose gold · Scalloped drops', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p36_07.jpg'], []],
            ['pendant-sets', 'Emerald Drop Set', 210000, 'Necklace + earrings · 18kt gold · Emerald drops · Minted elegance', 'natural', 'VVS', 'yellow', 18, false, true, false, ['p40_01.jpg'], []],
            ['pendant-sets', 'Kundan Pink Sapphire Set', 265000, 'Pendant + earrings · 18kt gold · Pink sapphires · Hand-set Kundan', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_07.jpg'], ['kundan-pendant-set-edit']],
            ['pendant-sets', 'Amethyst Kundan Set', 235000, 'Pendant + earrings · 18kt gold · Amethyst drops · Jadau setting', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_08.jpg'], ['kundan-pendant-set-edit']],
            ['pendant-sets', 'Blue Enamel Jhumka Set', 198000, 'Pendant + jhumkas · 18kt gold · Blue meenakari · Polki', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_02.jpg'], ['kundan-pendant-set-edit']],
            ['pendant-sets', 'Pearl Coral Heritage Set', 285000, 'Necklace + earrings · 18kt gold · Coral · Pearl strands · Kundan', 'polki', 'Uncut polki', 'yellow', 22, true, false, false, ['p42_04.jpg'], ['bridal-edit', 'kundan-pendant-set-edit']],
            ['pendant-sets', 'Cascade Drop Set', 172000, 'Necklace + earrings · 18kt rose gold · Cascading drops', 'lab_grown', 'VVS · E–F', 'rose', 18, false, true, false, ['p40_05.jpg'], []],
            ['pendant-sets', 'Floral Duo Set', 148000, 'Necklace + earrings · 18kt white gold · Floral stations', 'lab_grown', 'VVS · E–F', 'white', 18, false, true, false, ['p40_02.jpg'], []],
        ];

        $certSeq = 100001;
        foreach ($data as $i => [$cat, $name, $price, $desc, $dt, $quality, $metal, $purity, $jadau, $igi, $featured, $images, $collections]) {
            $slug = Str::slug($name);
            $product = Product::create([
                'category_id' => $cats[$cat]->id,
                'name' => $name,
                'slug' => $slug,
                'sku' => sprintf('CLV-%s-%03d', strtoupper(substr($cat, 0, 3)), $i + 1),
                'description' => $desc,
                'story' => $this->storyFor($jadau, $igi, $dt),
                'base_price' => $price,
                'diamond_type' => $dt,
                'diamond_quality' => $quality,
                'default_metal' => $metal,
                'default_purity' => $purity,
                'is_jadau' => $jadau,
                'igi_certified' => $igi,
                'bis_hallmarked' => true,
                'featured' => $featured,
            ]);

            foreach ($images as $j => $img) {
                $product->images()->create([
                    'path' => self::IMG.$img,
                    'alt' => $name,
                    'is_primary' => $j === 0,
                    'sort_order' => $j,
                ]);
            }

            foreach ($collections as $cslug) {
                $product->collections()->attach($cols[$cslug]->id, ['sort_order' => $i]);
            }

            $this->makeVariants($product, $jadau);

            if ($igi) {
                Certificate::create([
                    'certificate_no' => 'IGI'.(600000000 + $certSeq),
                    'type' => 'IGI',
                    'product_id' => $product->id,
                    'item_name' => $name,
                    'details' => [
                        'description' => $desc,
                        'clarity' => 'VVS1',
                        'colour' => 'E–F',
                        'diamond' => $dt === 'natural' ? 'Natural Diamond' : 'Lab-Grown Diamond',
                        'metal' => ucfirst($metal).' Gold '.$purity.'kt',
                        'hallmark' => 'BIS Hallmarked',
                    ],
                    'issued_on' => now()->subDays(30 + $i),
                ]);
                $certSeq += 7;
            }
        }
    }

    private function makeVariants(Product $product, bool $jadau): void
    {
        $metals = ['yellow', 'white', 'rose'];
        $purities = $jadau ? [18, 22] : [14, 18, 22];
        $purityDelta = [14 => -0.12, 18 => 0.0, 22 => 0.15];
        $diamondTypes = match ($product->diamond_type) {
            'lab_grown' => ['lab_grown', 'natural'],
            default => [$product->diamond_type],
        };

        foreach ($metals as $metal) {
            // Jadau/Kundan pieces are traditionally yellow gold only
            if ($jadau && $metal !== 'yellow') {
                continue;
            }
            foreach ($purities as $purity) {
                foreach ($diamondTypes as $dt) {
                    $delta = round($product->base_price * $purityDelta[$purity], 2);
                    if ($dt === 'natural' && $product->diamond_type === 'lab_grown') {
                        $delta += round($product->base_price * 0.85, 2);
                    }
                    $product->variants()->create([
                        'metal' => $metal,
                        'purity' => $purity,
                        'diamond_type' => $dt,
                        'price_delta' => $delta,
                        'sku' => $product->sku.'-'.strtoupper(substr($metal, 0, 1)).$purity.($dt === 'natural' ? 'N' : 'L'),
                    ]);
                }
            }
        }
    }

    private function storyFor(bool $jadau, bool $igi, string $dt): string
    {
        if ($jadau) {
            return 'Rooted in Rajputana heritage, Jadau is the art of setting uncut stones into gold with exquisite precision. Finished with the luminous grace of Kundan work, this piece carries a timeless sense of regal elegance — shaped by the hands of master karigars and inspected under 40x magnification before it leaves our atelier.';
        }
        if ($igi) {
            return 'This piece begins with a diamond chosen for exceptional character, then refined through IGI certification and set with exacting craftsmanship. Every design starts as a precision 3D CAD model, CNC-milled to micron tolerances, laser-finished, and rhodium-plated to international luxury standards. The result: brilliance, balance and fine detailing that feel quietly luxurious.';
        }

        return 'Crafted in BIS-hallmarked gold by master goldsmiths, every piece passes through state-of-the-art machinery — micron-level precision, mirror polish, and a finish that rivals the finest international luxury houses.';
    }
}
