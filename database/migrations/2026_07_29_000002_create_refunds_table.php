<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // A refund is its own record rather than a flag on `payments`, because a
    // single captured payment can be refunded more than once (a customer keeps
    // the ring, returns the earrings). Only a table can express that, and it is
    // also the audit trail: who refunded, how much, why, and what the gateway
    // said back.
    //
    // `payments.status` already documents 'refunded' as a legal value, so no
    // change is needed there — it flips to 'refunded' once the full captured
    // amount has been returned.
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();

            // Razorpay's rfnd_… id. Null while pending, and permanently null for
            // demo-mode refunds, which never leave this server.
            $table->string('gateway_refund_id')->nullable()->index();

            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('INR');
            $table->string('status', 24)->default('pending'); // pending|processed|failed
            $table->string('reason', 190)->nullable();

            // Who pressed the button. Nullable so a refund survives the admin
            // who issued it being revoked.
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->text('error')->nullable();       // gateway message when status = failed
            $table->json('payload')->nullable();     // raw gateway response
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
