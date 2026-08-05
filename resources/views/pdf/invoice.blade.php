@php
    // Indian digit grouping; DejaVu Sans (bundled with dompdf) carries U+20B9.
    $money = function ($v) {
        $v = (float) $v;
        $s = number_format(abs($v), 2, '.', '');
        [$int, $dec] = explode('.', $s);
        $last3 = substr($int, -3);
        $rest = substr($int, 0, -3);
        $grouped = $rest !== '' ? preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest).','.$last3 : $last3;

        return ($v < 0 ? '-' : '').'₹'.$grouped.'.'.$dec;
    };
    $dash = fn ($v) => trim((string) $v) !== '' ? $v : '—';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "DejaVu Sans", sans-serif; font-size: 9.5px; color: #241f19; }
        .page { padding: 34px 38px; }
        .gold { color: #7a5f34; }
        .muted { color: #7d7266; }
        .rule { border-bottom: 1px solid #e6dcc8; }
        .right { text-align: right; }

        .masthead { border-top: 4px solid #b08d57; padding-top: 18px; }
        .wordmark { font-family: "DejaVu Serif", serif; font-size: 24px; letter-spacing: 9px; }
        .tagline { font-size: 7.5px; letter-spacing: 3px; text-transform: uppercase; color: #b08d57; margin-top: 4px; }
        h2.doctitle { font-family: "DejaVu Serif", serif; font-size: 15px; font-weight: normal; letter-spacing: 2px; }

        table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 2px 0; vertical-align: top; }

        .parties { margin-top: 16px; }
        .parties td { width: 50%; vertical-align: top; padding: 10px 14px; border: 1px solid #e6dcc8; }
        .label { font-size: 7.5px; letter-spacing: 2px; text-transform: uppercase; color: #b08d57; margin-bottom: 6px; }

        .lines { margin-top: 18px; }
        .lines th { font-size: 7.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #fff;
                    background: #7a5f34; padding: 7px 8px; text-align: left; }
        .lines th.right, .lines td.right { text-align: right; }
        .lines td { padding: 7px 8px; border-bottom: 1px solid #f0e9dc; vertical-align: top; }

        .totals { margin-top: 10px; width: 46%; margin-left: 54%; }
        .totals td { padding: 4px 8px; }
        .totals .grand td { border-top: 1px solid #b08d57; font-size: 12px; padding-top: 8px;
                            font-family: "DejaVu Serif", serif; }

        .note { margin-top: 16px; padding: 9px 12px; background: #faf7f2; border: 1px solid #e6dcc8;
                font-size: 8.5px; line-height: 1.55; color: #4a4136; }
        .footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e6dcc8;
                  font-size: 7.5px; color: #9a8f7d; line-height: 1.6; }
        .provisional { color: #9c3b2e; font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
    </style>
</head>
<body>
<div class="page">
    <table class="masthead">
        <tr>
            <td>
                <div class="wordmark">CLAVIRA</div>
                <div class="tagline">Fine Jewellery</div>
            </td>
            <td class="right">
                <h2 class="doctitle">{{ $export ? 'EXPORT INVOICE' : 'TAX INVOICE' }}</h2>
                <table class="meta" style="margin-top: 8px; width: auto; margin-left: auto;">
                    <tr><td class="muted" style="padding-right: 14px;">Invoice No.</td><td class="right"><strong>{{ $invoice->invoice_no }}</strong></td></tr>
                    <tr><td class="muted" style="padding-right: 14px;">Invoice Date</td><td class="right">{{ $invoice->issued_at->format('d M Y') }}</td></tr>
                    <tr><td class="muted" style="padding-right: 14px;">Order No.</td><td class="right">{{ $order->order_no }}</td></tr>
                    <tr><td class="muted" style="padding-right: 14px;">Order Date</td><td class="right">{{ $order->created_at?->format('d M Y') }}</td></tr>
                    <tr><td class="muted" style="padding-right: 14px;">Place of Supply</td><td class="right">{{ $placeOfSupply }}</td></tr>
                </table>
                @if ($provisional)
                    <div class="provisional">Provisional — GSTIN pending</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="parties">
        <tr>
            <td>
                <div class="label">Sold By</div>
                <strong>{{ $dash($seller['legal_name']) }}</strong><br>
                {{ $dash($seller['address']) }}<br>
                {{ trim($seller['city'].' '.$seller['postal_code']) ?: '—' }}, {{ $seller['state'] }} (State Code {{ $seller['state_code'] }})<br>
                <span class="muted">GSTIN:</span> {{ $dash($seller['gstin']) }}
                @if (trim((string) $seller['pan']) !== '')
                    &nbsp; <span class="muted">PAN:</span> {{ $seller['pan'] }}
                @endif
                <br>
                <span class="muted">{{ $seller['email'] }}@if (trim((string) $seller['phone']) !== '') · {{ $seller['phone'] }}@endif</span>
            </td>
            <td>
                <div class="label">Billed &amp; Shipped To</div>
                <strong>{{ $dash($address['name'] ?? '') }}</strong><br>
                {{ $dash($address['line1'] ?? '') }}@if (!empty($address['line2'])), {{ $address['line2'] }}@endif<br>
                {{ $address['city'] ?? '' }}, {{ $address['state'] ?? '' }} {{ $address['postal_code'] ?? '' }}<br>
                {{ $countryName }}<br>
                <span class="muted">{{ $order->email }}@if (!empty($address['phone'])) · {{ $address['phone'] }}@endif</span>
            </td>
        </tr>
    </table>

    <table class="lines">
        <thead>
            <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 44%;">Description</th>
                <th style="width: 10%;">HSN/SAC</th>
                <th class="right" style="width: 8%;">Qty</th>
                <th class="right" style="width: 17%;">Unit Price</th>
                <th class="right" style="width: 17%;">Taxable Value</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>
                        {{ $item->name }}
                        @if (!empty($item->options))
                            <br><span class="muted" style="font-size: 8px;">
                                @foreach ($item->options as $key => $value)
                                    @if (!is_array($value) && $value !== null && $value !== '')
                                        {{ ucfirst(str_replace('_', ' ', $key)) }}: {{ $value }}@if (!$loop->last) · @endif
                                    @endif
                                @endforeach
                            </span>
                        @endif
                    </td>
                    <td>{{ $hsn }}</td>
                    <td class="right">{{ $item->qty }}</td>
                    <td class="right">{{ $money($item->unit_price) }}</td>
                    <td class="right">{{ $money($item->total) }}</td>
                </tr>
            @endforeach
            @if ((float) $order->shipping > 0)
                <tr>
                    <td>{{ $order->items->count() + 1 }}</td>
                    <td>Insured international shipping</td>
                    <td>{{ $sacShipping }}</td>
                    <td class="right">1</td>
                    <td class="right">{{ $money($order->shipping) }}</td>
                    <td class="right">{{ $money($order->shipping) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="muted">Taxable Value</td><td class="right">{{ $money($order->subtotal + $order->shipping) }}</td></tr>
        @if ($taxLabel === 'cgst_sgst')
            <tr><td class="muted">CGST @ {{ $gstPercent / 2 }}%</td><td class="right">{{ $money($cgst) }}</td></tr>
            <tr><td class="muted">SGST @ {{ $gstPercent / 2 }}%</td><td class="right">{{ $money($sgst) }}</td></tr>
        @elseif ($taxLabel === 'igst')
            <tr><td class="muted">IGST @ {{ $gstPercent }}%</td><td class="right">{{ $money($igst) }}</td></tr>
        @else
            <tr><td class="muted">GST (zero-rated export)</td><td class="right">{{ $money(0) }}</td></tr>
        @endif
        <tr class="grand"><td>Total</td><td class="right">{{ $money($order->total) }}</td></tr>
        @if ($refunded > 0)
            <tr><td class="muted">Refunded</td><td class="right">− {{ $money($refunded) }}</td></tr>
            <tr><td class="muted"><strong>Net Paid</strong></td><td class="right"><strong>{{ $money(max(0, $order->total - $refunded)) }}</strong></td></tr>
        @endif
    </table>

    @if ($export)
        <div class="note">
            Supply meant for export. GST zero-rated under the IGST Act. Amount charged in INR;
            any import duty or destination tax is collected from the recipient by
            {{ $countryName }} customs. Goods insured in transit until delivery.
        </div>
    @endif

    <div class="note">
        Every piece is BIS hallmarked and IGI certified where applicable. Payment received via
        {{ strtoupper($order->payment_method) === 'STUB' ? 'demo checkout' : ucfirst($order->payment_method) }}
        against order {{ $order->order_no }}. This is a computer-generated invoice and requires no signature.
    </div>

    <div class="footer">
        {{ $dash($seller['legal_name']) }} · {{ $seller['email'] }} · BIS Hallmarked · IGI Certified<br>
        Questions about this invoice? Write to {{ $seller['email'] }} quoting {{ $invoice->invoice_no }}.
    </div>
</div>
</body>
</html>
