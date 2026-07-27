<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Net weight of gold in the piece, in grams. This is the missing input that
    // makes a genuine "gold value = grams x today's published rate" line
    // possible on the PDP — until now nothing in the schema recorded weight
    // (product_variants.carat_weight is DIAMOND carat, and is null on every row).
    //
    // Nullable, like the metal/making/stone columns it sits beside: it stays null
    // until the client supplies real per-piece weights alongside final pricing,
    // and PriceBreakup falls back to the stored composition when it is absent.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('gross_weight_g', 8, 3)->nullable()->after('stone_value');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('gross_weight_g');
        });
    }
};
