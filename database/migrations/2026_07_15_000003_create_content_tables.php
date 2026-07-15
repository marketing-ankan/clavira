<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Verify Report" — IGI / BIS certificate lookup
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->string('certificate_no', 40)->unique();
            $table->string('type', 10)->default('IGI');      // IGI|BIS
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name');
            $table->json('details');                         // {shape, carat, clarity, colour, metal, purity, gross_weight}
            $table->date('issued_on')->nullable();
            $table->timestamps();
        });

        // Daily gold rate ticker (INR per gram)
        Schema::create('gold_rates', function (Blueprint $table) {
            $table->id();
            $table->decimal('rate_24k', 10, 2);
            $table->decimal('rate_22k', 10, 2);
            $table->decimal('rate_18k', 10, 2);
            $table->decimal('rate_14k', 10, 2);
            $table->string('source', 40)->default('manual'); // manual|ibja
            $table->timestamp('effective_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gold_rates');
        Schema::dropIfExists('certificates');
    }
};
