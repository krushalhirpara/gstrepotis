<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;

    public function __construct(string $otp)
    {
        $this->otp = $otp;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your GST Suite verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 40px 20px; color: #111111; }
                .container { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 40px; }
                .header { text-align: center; margin-bottom: 24px; }
                .logo { display: inline-block; width: 44px; height: 44px; background: #000000; color: #ffffff; line-height: 44px; font-weight: 900; font-size: 16px; border-radius: 8px; font-family: monospace; }
                .title { font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 8px; color: #111111; letter-spacing: -0.5px; }
                .subtitle { font-size: 13px; color: #555555; line-height: 1.5; margin-bottom: 28px; }
                .otp-box { background: #fafafa; border: 1px border #e5e5e5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 28px; }
                .otp-code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #000000; }
                .footer { text-align: center; font-size: 12px; color: #888888; border-t: 1px solid #e5e5e5; pt: 20px; margin-top: 28px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>GS</div>
                    <div class='title'>Verify your email address</div>
                    <div class='subtitle'>Please use the following 6-digit verification code to complete your GST Suite sign up:</div>
                </div>

                <div class='otp-box'>
                    <div class='otp-code'>{$this->otp}</div>
                </div>

                <div class='subtitle' style='text-align: center;'>
                    This verification code expires in <strong>10 minutes</strong>.<br/>
                    If you did not request this code, you can safely ignore this email.
                </div>

                <div class='footer'>
                    &copy; " . date('Y') . " GST Suite Financial Infrastructure. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
