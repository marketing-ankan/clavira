@component('emails.layout', ['title' => 'Your Clavira admin access'])
    <p style="margin:0 0 16px; font-size:20px; font-family: Georgia, serif; color:#241f19;">Hello {{ $name }},</p>

    <p style="margin:0 0 20px;">
        You have been granted <strong>administrator access</strong> to the Clavira dashboard.
        Set your password using the secure button below to activate your account.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr>
            <td align="center" bgcolor="#b08d57" style="border-radius:2px;">
                <a href="{{ $url }}"
                   style="display:inline-block; padding:14px 34px; font-family: Arial, Helvetica, sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#ffffff; text-decoration:none;">
                    Set your password
                </a>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 8px; font-size:13px; color:#7d7266;">
        This secure link is valid for {{ $ttlHours }} hours and can be used once.
    </p>
    <p style="margin:0; font-size:12px; color:#9a8f7d; word-break:break-all;">
        If the button does not work, copy and paste this address into your browser:<br>
        <a href="{{ $url }}" style="color:#b08d57;">{{ $url }}</a>
    </p>
@endcomponent
