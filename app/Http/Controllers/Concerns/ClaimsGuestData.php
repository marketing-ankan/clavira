<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Cart;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Http\Request;

/**
 * Attaches the guest cart and merges the guest wishlist onto a user the moment
 * they become authenticated. Shared by every path that logs someone in —
 * register, login, and password reset — so a customer never loses a basket
 * they built before signing in.
 */
trait ClaimsGuestData
{
    protected function claimGuestData(Request $request, User $user): void
    {
        if ($token = $request->session()->get('cart_token')) {
            Cart::where('session_token', $token)->whereNull('user_id')->update(['user_id' => $user->id]);
        }

        if ($token = $request->session()->get('wishlist_token')) {
            foreach (WishlistItem::where('session_token', $token)->whereNull('user_id')->get() as $item) {
                $exists = WishlistItem::where('user_id', $user->id)->where('product_id', $item->product_id)->exists();
                $exists ? $item->delete() : $item->update(['user_id' => $user->id, 'session_token' => null]);
            }
        }
    }
}
