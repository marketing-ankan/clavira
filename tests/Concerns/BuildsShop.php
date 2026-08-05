<?php

namespace Tests\Concerns;

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Fixture builders. Only User has a factory in this codebase; every domain
 * model is $guarded = [], so plain create() with explicit uniques is the
 * house pattern (slugs/SKUs/order numbers all carry UNIQUE indexes).
 */
trait BuildsShop
{
    protected function makeCategory(array $overrides = []): Category
    {
        $slug = 'cat-'.Str::lower(Str::random(8));

        return Category::create(array_merge([
            'name' => 'Rings', 'slug' => $slug, 'sort_order' => 1, 'active' => true,
        ], $overrides));
    }

    protected function makeProduct(array $overrides = [], ?Category $category = null): Product
    {
        $slug = 'piece-'.Str::lower(Str::random(8));

        return Product::create(array_merge([
            'category_id' => ($category ?? $this->makeCategory())->id,
            'name' => 'Test Solitaire',
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'description' => '18kt white gold test piece',
            'base_price' => 100000.00,
            'currency' => 'INR',
            'diamond_type' => 'lab_grown',
            'default_metal' => 'white',
            'default_purity' => 18,
            'active' => true,
        ], $overrides));
    }

    protected function makeCustomer(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Test Customer',
            'email' => 'customer-'.Str::lower(Str::random(8)).'@example.com',
            'password' => Hash::make('CustomerPass123'),
        ], $overrides));
    }

    /**
     * An admin who actually passes the gate: the DB flag alone is never
     * enough — the email must also be owner/domain-eligible, so the test
     * config is pinned rather than inherited from the machine's .env.
     */
    protected function makeAdmin(): User
    {
        config([
            'admin.owners' => ['owner@winquestonline.com'],
            'admin.allowed_domains' => ['winquestonline.com'],
        ]);

        $admin = User::create([
            'name' => 'Owner',
            'email' => 'owner@winquestonline.com',
            'password' => Hash::make('OwnerPass12345'),
        ]);
        $admin->is_admin = true; // not mass-assignable, by design
        $admin->save();

        return $admin;
    }

    protected function makePaidOrder(?User $user = null, array $overrides = []): Order
    {
        $order = Order::create(array_merge([
            'order_no' => 'T-'.strtoupper(Str::random(10)),
            'user_id' => $user?->id,
            'email' => $user->email ?? 'buyer@example.com',
            'phone_country_code' => '+91',
            'phone' => '9820011223',
            'status' => 'paid',
            'currency' => 'INR',
            'subtotal' => 100000.00,
            'shipping' => 0,
            'tax' => 3000.00,
            'total' => 103000.00,
            'shipping_address' => [
                'name' => 'Test Customer', 'line1' => '14 Test Road', 'city' => 'Mumbai',
                'state' => 'Maharashtra', 'postal_code' => '400001', 'country' => 'IN',
                'phone' => '+91 98200 11223',
            ],
            'payment_method' => 'stub',
        ], $overrides));

        $order->items()->create([
            'product_id' => null, 'name' => 'Test Solitaire', 'qty' => 1,
            'unit_price' => $order->subtotal, 'total' => $order->subtotal,
        ]);

        Payment::create([
            'order_id' => $order->id, 'gateway' => 'stub',
            'gateway_order_id' => 'stub_'.Str::random(14),
            'gateway_payment_id' => 'pay_stub_'.Str::random(10),
            'amount' => $order->total, 'currency' => 'INR', 'status' => 'captured',
        ]);

        return $order->fresh();
    }
}
