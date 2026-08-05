<?php

namespace App\Services;

use App\Mail\OrderPlacedMail;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Transactional order email. Kept out of the controllers because two separate
 * paths mark an order paid — the browser callback and the Razorpay webhook —
 * and both must be able to trigger the confirmation without the customer ever
 * receiving it twice.
 *
 * Like the admin-invite pipeline, a mail failure is logged and swallowed: an
 * SMTP outage must never fail a payment that has already been captured.
 */
class OrderMailer
{
    /**
     * Send the order confirmation exactly once. Returns true only when this call
     * is the one that actually delivered it.
     */
    public function sendConfirmation(Order $order): bool
    {
        // Claim the send atomically. Whichever of confirm()/webhook() wins this
        // conditional UPDATE owns the email; the loser sees 0 affected rows and
        // returns without sending. This is the race guard, not the stamp itself.
        $claimed = Order::whereKey($order->getKey())
            ->whereNull('confirmation_email_sent_at')
            ->update(['confirmation_email_sent_at' => now()]);

        if (! $claimed) {
            return false;
        }

        try {
            $order->loadMissing('items');
            Mail::to($order->email)->send(new OrderPlacedMail($order));
        } catch (\Throwable $e) {
            // Release the claim so the webhook (or an owner, manually) can retry.
            // The order stays paid either way — only the email is outstanding.
            Order::whereKey($order->getKey())->update(['confirmation_email_sent_at' => null]);

            Log::error('Order confirmation email failed to send', [
                'order_no' => $order->order_no,
                'email' => $order->email,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }
}
