@component('emails.layout', ['title' => 'Clavira admin sign-in'])
    <p style="margin:0 0 16px; font-size:20px; font-family: Georgia, serif; color:#241f19;">Admin sign-in</p>

    <p style="margin:0 0 18px;">
        Someone signed in to the Clavira admin dashboard. If this was you or a fellow owner, no action is needed.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-size:14px; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#7d7266; width:120px;">Account</td><td style="padding:6px 0; color:#241f19;">{{ $who }} &lt;{{ $email }}&gt;</td></tr>
        <tr><td style="padding:6px 0; color:#7d7266;">Time</td><td style="padding:6px 0; color:#241f19;">{{ $when }}</td></tr>
        <tr><td style="padding:6px 0; color:#7d7266;">IP address</td><td style="padding:6px 0; color:#241f19;">{{ $ip }}</td></tr>
        <tr><td style="padding:6px 0; color:#7d7266; vertical-align:top;">Device</td><td style="padding:6px 0; color:#241f19;">{{ $agent }}</td></tr>
    </table>

    <p style="margin:22px 0 0; font-size:13px; color:#7c2b30;">
        If you do not recognise this sign-in, change your password immediately and revoke any unknown admin from
        the Admins page.
    </p>
@endcomponent
