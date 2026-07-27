<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Optional price-breakup components. Left null until real (excl-GST) pricing
    // is supplied; when set, the PDP shows an itemised metal / making / stone
    // composition (Angara-style). GST is always computed on top at 3%.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('metal_value', 12, 2)->nullable()->after('base_price');
            $table->decimal('making_charge', 12, 2)->nullable()->after('metal_value');
            $table->decimal('stone_value', 12, 2)->nullable()->after('making_charge');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['metal_value', 'making_charge', 'stone_value']);
        });
    }
};
