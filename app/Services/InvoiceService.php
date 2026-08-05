<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Support\Countries;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * GST invoice generation.
 *
 * The tax figures are read off the ORDER — the amount the customer actually
 * paid — never recomputed from today's catalogue. The invoice only decides how
 * that stored tax is labelled: CGST+SGST when the buyer's state matches the
 * seller's, IGST when it doesn't, zero-rated export when the order left India.
 */
class InvoiceService
{
    /** Order states that have money behind them and therefore an invoice. */
    public const INVOICEABLE = ['paid', 'processing', 'shipped', 'delivered', 'refunded'];

    public function invoiceable(Order $order): bool
    {
        return in_array($order->status, self::INVOICEABLE, true);
    }

    /**
     * The order's invoice, numbering it on first call. Runs inside a
     * transaction with the sequence row-locked so two simultaneous downloads
     * cannot mint two numbers — a duplicate GST series is an audit finding.
     */
    public function findOrCreateFor(Order $order): Invoice
    {
        return Invoice::where('order_id', $order->id)->first()
            ?? DB::transaction(function () use ($order) {
                $fy = $this->fiscalYear(now());

                $next = (int) Invoice::where('fiscal_year', $fy)
                    ->lockForUpdate()
                    ->max('sequence') + 1;

                return Invoice::create([
                    'order_id' => $order->id,
                    'invoice_no' => sprintf('%s-%s-%06d', config('invoice.prefix'), $fy, $next),
                    'fiscal_year' => $fy,
                    'sequence' => $next,
                    'issued_at' => now(),
                ]);
            });
    }

    /** Renders the invoice PDF as a download response. */
    public function download(Order $order): Response
    {
        $invoice = $this->findOrCreateFor($order);
        $order->loadMissing(['items', 'refunds']);

        $pdf = Pdf::loadView('pdf.invoice', $this->viewData($order, $invoice))
            ->setPaper('a4');

        return $pdf->download($invoice->invoice_no.'.pdf');
    }

    /** @return array<string, mixed> */
    public function viewData(Order $order, Invoice $invoice): array
    {
        $seller = config('invoice.seller');
        $address = $order->shipping_address ?? [];
        $country = strtoupper($address['country'] ?? 'IN');
        $export = ! Countries::isDomestic($country);

        // Intra-state vs inter-state is decided by the buyer's state as they
        // typed it. A fuzzy mismatch labels the tax IGST — the amount is
        // identical either way, only the split differs.
        $sameState = ! $export && strcasecmp(trim($address['state'] ?? ''), trim($seller['state'])) === 0;

        $tax = round((float) $order->tax, 2);

        return [
            'invoice' => $invoice,
            'order' => $order,
            'seller' => $seller,
            'address' => $address,
            'countryName' => Countries::name($country),
            'export' => $export,
            'placeOfSupply' => $export
                ? Countries::name($country).' (export)'
                : trim(($address['state'] ?? '')).' ('.$seller['state_code'].' seller)',
            'taxLabel' => $export ? 'export' : ($sameState ? 'cgst_sgst' : 'igst'),
            'cgst' => $sameState ? round($tax / 2, 2) : 0.0,
            'sgst' => $sameState ? round($tax - round($tax / 2, 2), 2) : 0.0,
            'igst' => (! $export && ! $sameState) ? $tax : 0.0,
            'hsn' => config('invoice.hsn_jewellery'),
            'sacShipping' => config('invoice.sac_shipping'),
            'gstPercent' => rtrim(rtrim(number_format((float) config('clavira.gst_rate', 0.03) * 100, 2), '0'), '.'),
            'provisional' => trim((string) $seller['gstin']) === '',
            'refunded' => $order->refundedTotal(),
        ];
    }

    /** '2627' for any date in fiscal year Apr 2026 – Mar 2027. */
    public function fiscalYear(Carbon $when): string
    {
        $start = $when->month >= 4 ? $when->year : $when->year - 1;

        return substr((string) $start, -2).substr((string) ($start + 1), -2);
    }
}
