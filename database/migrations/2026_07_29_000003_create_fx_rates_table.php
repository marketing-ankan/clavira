<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Indicative FX for the NRI storefront. One row per display currency,
    // refreshed daily from a keyless feed. These NEVER price an order —
    // Razorpay settles in INR; the rates only power the "≈ AED 1,890" hints,
    // which is why a small table with no history is enough.
    public function up(): void
    {
        Schema::create('fx_rates', function (Blueprint $table) {
            $table->string('code', 3)->primary();

            // Units of `code` per 1 INR (the shape open.er-api.com returns for
            // base INR), so display = round(inr_amount * per_inr).
            $table->decimal('per_inr', 14, 8);

            $table->timestamp('fetched_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fx_rates');
    }
};
