<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class CustomerAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        Auth::login($user, remember: true);
        $request->session()->regenerate();
        $this->claimGuestData($request, $user);

        return response()->json(['user' => $this->userPayload($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'remember' => 'boolean',
        ]);

        if (! Auth::attempt(['email' => $data['email'], 'password' => $data['password']], $data['remember'] ?? true)) {
            return response()->json(['message' => 'Invalid email or password.'], 422);
        }

        $request->session()->regenerate();
        $this->claimGuestData($request, $request->user());

        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) $user->is_admin,
        ];
    }

    /** On login/register, attach the guest cart and merge the guest wishlist to the user. */
    private function claimGuestData(Request $request, User $user): void
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
