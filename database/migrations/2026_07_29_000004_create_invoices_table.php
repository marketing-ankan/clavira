<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // One invoice per order, numbered in its own fiscal-year series as GST
    // convention expects (order numbers and invoice numbers are different
    // documents). The row is created on first download and reused thereafter,
    // so re-downloading can never re-number.
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('invoice_no', 32)->unique();

            // 'YYNN' fiscal-year key, e.g. '2627' for FY 2026-27, plus the
            // per-year sequence — kept as columns so the next number is a
            // simple MAX(sequence) under a lock, immune to deletes.
            $table->string('fiscal_year', 4);
            $table->unsignedInteger('sequence');

            $table->timestamp('issued_at');
            $table->timestamps();

            $table->unique(['fiscal_year', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
