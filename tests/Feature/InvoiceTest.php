<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    public function test_owner_downloads_a_pdf_and_renumbering_never_happens(): void
    {
        $customer = $this->makeCustomer();
        $order = $this->makePaidOrder($customer);

        $this->actingAs($customer);

        $first = $this->get("/api/account/orders/{$order->order_no}/invoice");
        $first->assertOk();
        $this->assertSame('application/pdf', $first->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF-', $first->getContent());

        $number = Invoice::firstOrFail()->invoice_no;

        // Second download reuses the same invoice row and number.
        $this->get("/api/account/orders/{$order->order_no}/invoice")->assertOk();
        $this->assertSame(1, Invoice::count());
        $this->assertSame($number, Invoice::firstOrFail()->invoice_no);
    }

    public function test_invoices_are_owner_scoped_and_status_gated(): void
    {
        $owner = $this->makeCustomer();
        $stranger = $this->makeCustomer();
        $paid = $this->makePaidOrder($owner);
        $pending = $this->makePaidOrder($owner, ['status' => 'pending']);

        $this->getJson("/api/account/orders/{$paid->order_no}/invoice")->assertUnauthorized();

        $this->actingAs($stranger);
        $this->getJson("/api/account/orders/{$paid->order_no}/invoice")->assertNotFound();

        $this->actingAs($owner);
        $this->getJson("/api/account/orders/{$pending->order_no}/invoice")->assertUnprocessable();
    }

    public function test_admin_can_download_any_invoice_customers_cannot_use_admin_route(): void
    {
        $order = $this->makePaidOrder($this->makeCustomer());
        $admin = $this->makeAdmin();

        $this->actingAs($this->makeCustomer(['email' => 'plain@example.com']));
        $this->getJson("/api/admin/orders/{$order->id}/invoice")->assertForbidden();

        $this->actingAs($admin);
        $this->get("/api/admin/orders/{$order->id}/invoice")->assertOk();
    }

    public function test_tax_split_follows_the_buyers_state_and_country(): void
    {
        $service = app(InvoiceService::class);
        config(['invoice.seller.state' => 'Maharashtra']);

        $intra = $this->makePaidOrder(null, ['tax' => 3000.0]);
        $data = $service->viewData($intra, $service->findOrCreateFor($intra));
        $this->assertSame('cgst_sgst', $data['taxLabel']);
        $this->assertSame(1500.0, $data['cgst']);
        $this->assertSame(1500.0, $data['sgst']);

        $inter = $this->makePaidOrder(null, [
            'shipping_address' => ['name' => 'X', 'state' => 'Karnataka', 'country' => 'IN', 'line1' => 'x', 'city' => 'Bengaluru', 'postal_code' => '560001'],
        ]);
        $data = $service->viewData($inter, $service->findOrCreateFor($inter));
        $this->assertSame('igst', $data['taxLabel']);
        $this->assertSame(3000.0, $data['igst']);

        $export = $this->makePaidOrder(null, [
            'tax' => 0, 'shipping' => 4500, 'total' => 104500.0,
            'shipping_address' => ['name' => 'X', 'state' => 'Dubai', 'country' => 'AE', 'line1' => 'x', 'city' => 'Dubai', 'postal_code' => '0'],
        ]);
        $data = $service->viewData($export, $service->findOrCreateFor($export));
        $this->assertSame('export', $data['taxLabel']);
        $this->assertSame(0.0, $data['igst']);
    }

    public function test_fiscal_year_series(): void
    {
        $service = app(InvoiceService::class);

        $this->assertSame('2627', $service->fiscalYear(Carbon::parse('2026-07-29')));
        $this->assertSame('2627', $service->fiscalYear(Carbon::parse('2027-03-31')));
        $this->assertSame('2728', $service->fiscalYear(Carbon::parse('2027-04-01')));

        $a = $service->findOrCreateFor($this->makePaidOrder());
        $b = $service->findOrCreateFor($this->makePaidOrder());
        $this->assertSame($a->sequence + 1, $b->sequence);
        $this->assertMatchesRegularExpression('/^CLV-INV-\d{4}-\d{6}$/', $b->invoice_no);
    }
}
