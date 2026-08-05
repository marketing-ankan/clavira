<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Stamp set the moment the customer's order-confirmation email is handed to
    // the mailer. Two independent paths can mark an order paid — the browser
    // callback (/api/checkout/confirm) and Razorpay's server-to-server webhook —
    // and in the normal case BOTH fire for the same order. Without this column
    // the customer receives the confirmation twice.
    //
    // It doubles as an operational record: a paid order with a null stamp is one
    // whose email failed (SMTP down, bad credentials), which is exactly the set
    // an owner needs to be able to find and re-send.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('confirmation_email_sent_at')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('confirmation_email_sent_at');
        });
    }
};
