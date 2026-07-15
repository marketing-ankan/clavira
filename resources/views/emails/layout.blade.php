<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ $title ?? 'Clavira' }}</title>
</head>
<body style="margin:0; padding:0; background:#f1ebe1; font-family: Georgia, 'Times New Roman', serif; color:#241f19;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ebe1; padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-top:3px solid #b08d57;">
                    {{-- Masthead --}}
                    <tr>
                        <td align="center" style="padding:36px 40px 8px;">
                            <div style="font-size:28px; letter-spacing:10px; font-weight:bold; color:#241f19; padding-left:10px;">CLAVIRA</div>
                            <div style="font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#b08d57; margin-top:8px;">Fine Jewellery</div>
                        </td>
                    </tr>
                    {{-- Body --}}
                    <tr>
                        <td style="padding:24px 40px 8px; font-size:16px; line-height:1.65; color:#4a4136; font-family: Arial, Helvetica, sans-serif;">
                            {{ $slot }}
                        </td>
                    </tr>
                    {{-- Footer --}}
                    <tr>
                        <td style="padding:28px 40px 36px;">
                            <hr style="border:none; border-top:1px solid #e6dcc8; margin:0 0 16px;">
                            <p style="margin:0; font-size:11px; line-height:1.6; color:#9a8f7d; font-family: Arial, Helvetica, sans-serif;">
                                BIS Hallmarked &middot; IGI Certified &middot; Est. in Excellence<br>
                                This is an automated message from the Clavira team. If you were not expecting it, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                </table>
                <p style="max-width:560px; margin:16px auto 0; font-size:11px; color:#a99a86; font-family: Arial, Helvetica, sans-serif;">
                    &copy; {{ date('Y') }} Clavira. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
