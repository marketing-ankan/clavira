@php
    // Indian grouping, decimals only when they carry meaning (49440 -> 49,440).
    $money = function ($v) {
        $v = (float) $v;
        $s = number_format(abs($v), fmod($v, 1) == 0.0 ? 0 : 2, '.', '');
        [$int, $dec] = array_pad(explode('.', $s), 2, null);
        $last3 = substr($int, -3);
        $rest = substr($int, 0, -3);
        $grouped = $rest !== '' && $rest !== false
            ? preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest).','.$last3
            : $last3;

        return '&#8377;'.$grouped.($dec !== null ? '.'.$dec : '');
    };
@endphp

@component('emails.layout', ['title' => 'Your Clavira order '.$order->order_no])
    <p style="margin:0 0 16px; font-size:20px; font-family: Georgia, serif; color:#241f19;">
        Thank you{{ !empty($address['name']) ? ', '.explode(' ', trim($address['name']))[0] : '' }}.
    </p>

    <p style="margin:0 0 22px;">
        Your order has been received and is now being prepared with care. Each piece is
        inspected, hallmarked and insured before it leaves our atelier.
    </p>

    {{-- Order summary card --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin:0 0 26px; border:1px solid #e6dcc8; background:#fbf8f3;">
        <tr>
            <td style="padding:16px 20px; font-family: Arial, Helvetica, sans-serif; font-size:13px; color:#7d7266;">
                Order number
                <div style="margin-top:4px; font-size:16px; letter-spacing:1px; color:#241f19; font-weight:bold;">
                    {{ $order->order_no }}
                </div>
            </td>
            <td align="right" style="padding:16px 20px; font-family: Arial, Helvetica, sans-serif; font-size:13px; color:#7d7266;">
                Placed on
                <div style="margin-top:4px; font-size:16px; color:#241f19;">
                    {{ $order->created_at?->format('d M Y') }}
                </div>
            </td>
        </tr>
    </table>

    {{-- Line items --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
        <tr>
            <td colspan="2" style="padding:0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#b08d57; border-bottom:1px solid #e6dcc8;">
                Your pieces
            </td>
        </tr>
        @foreach ($items as $item)
            <tr>
                <td style="padding:16px 0; border-bottom:1px solid #f0e9dc; vertical-align:top;">
                    <div style="font-family: Georgia, serif; font-size:16px; color:#241f19;">{{ $item->name }}</div>
                    @if (!empty($item->options))
                        <div style="margin-top:5px; font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#7d7266;">
                            @foreach ($item->options as $key => $value)
                                @if (!is_array($value) && $value !== null && $value !== '')
                                    {{ ucfirst(str_replace('_', ' ', $key)) }}: {{ $value }}@if (!$loop->last) &nbsp;&middot;&nbsp; @endif
                                @endif
                            @endforeach
                        </div>
                    @endif
                    <div style="margin-top:5px; font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#9a8f7d;">
                        Quantity {{ $item->qty }}
                    </div>
                </td>
                <td align="right" style="padding:16px 0; border-bottom:1px solid #f0e9dc; vertical-align:top; font-family: Arial, Helvetica, sans-serif; font-size:15px; color:#241f19; white-space:nowrap;">
                    {!! $money($item->total) !!}
                </td>
            </tr>
        @endforeach
    </table>

    {{-- Totals --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px; font-family: Arial, Helvetica, sans-serif; font-size:14px;">
        <tr>
            <td style="padding:12px 0 4px; color:#7d7266;">Subtotal</td>
            <td align="right" style="padding:12px 0 4px; color:#241f19;">{!! $money($order->subtotal) !!}</td>
        </tr>
        @if ((float) $order->shipping > 0)
            <tr>
                <td style="padding:4px 0; color:#7d7266;">Shipping</td>
                <td align="right" style="padding:4px 0; color:#241f19;">{!! $money($order->shipping) !!}</td>
            </tr>
        @endif
        <tr>
            <td style="padding:4px 0; color:#7d7266;">GST</td>
            <td align="right" style="padding:4px 0; color:#241f19;">{!! $money($order->tax) !!}</td>
        </tr>
        <tr>
            <td style="padding:14px 0 0; border-top:1px solid #e6dcc8; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#b08d57;">Total paid</td>
            <td align="right" style="padding:14px 0 0; border-top:1px solid #e6dcc8; font-family: Georgia, serif; font-size:20px; color:#241f19;">{!! $money($order->total) !!}</td>
        </tr>
    </table>

    {{-- Delivery --}}
    @if (!empty($address))
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
            <tr>
                <td style="padding:0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#b08d57; border-bottom:1px solid #e6dcc8;">
                    Delivering to
                </td>
            </tr>
            <tr>
                <td style="padding:14px 0 0; font-family: Arial, Helvetica, sans-serif; font-size:14px; line-height:1.7; color:#4a4136;">
                    {{ $address['name'] ?? '' }}<br>
                    {{ $address['line1'] ?? '' }}<br>
                    @if (!empty($address['line2'])){{ $address['line2'] }}<br>@endif
                    {{ $address['city'] ?? '' }}, {{ $address['state'] ?? '' }} {{ $address['postal_code'] ?? '' }}<br>
                    {{ \App\Support\Countries::name($address['country'] ?? null) }}
                    @if (!empty($address['phone']))
                        <br><span style="color:#7d7266;">{{ $address['phone'] }}</span>
                    @endif
                </td>
            </tr>
        </table>
    @endif

    <p style="margin:0 0 24px; font-size:13px; color:#7d7266;">
        We will write to you again the moment your order is dispatched, with tracking details.
        Every piece is BIS hallmarked, IGI certified where applicable, and shipped fully insured.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
            <td align="center" bgcolor="#b08d57" style="border-radius:2px;">
                <a href="{{ rtrim(config('app.url'), '/') }}/account"
                   style="display:inline-block; padding:14px 34px; font-family: Arial, Helvetica, sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#ffffff; text-decoration:none;">
                    View your order
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#9a8f7d;">
        Questions about this order? Write to
        <a href="mailto:{{ $supportEmail }}" style="color:#b08d57;">{{ $supportEmail }}</a>
        or call {{ $supportPhone }}, quoting {{ $order->order_no }}.
    </p>
@endcomponent
