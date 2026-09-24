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
    public string $userName;

    public function __construct(string $otp, string $userName = 'User')
    {
        $this->otp = $otp;
        $this->userName = $userName ?: 'User';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'GST REPOTIS Login Verification Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
            text: null,
        );
    }

    protected function buildHtml(): string
    {
        $safeName = htmlspecialchars($this->userName, ENT_QUOTES, 'UTF-8');
        $safeOtp = htmlspecialchars($this->otp, ENT_QUOTES, 'UTF-8');
        $year = date('Y');

        return "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>GST REPOTIS Login Verification Code</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f8fafc;
                    margin: 0;
                    padding: 30px 15px;
                    color: #0f172a;
                    -webkit-font-smoothing: antialiased;
                }
                .container {
                    max-width: 520px;
                    margin: 0 auto;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 36px 32px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                }
                .header {
                    text-align: center;
                    margin-bottom: 28px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 20px;
                }
                .brand-title {
                    font-size: 20px;
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: -0.5px;
                    margin: 0 0 4px 0;
                }
                .brand-subtitle {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                    margin: 0;
                }
                .greeting {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 14px;
                }
                .text {
                    font-size: 14px;
                    color: #334155;
                    line-height: 1.6;
                    margin-bottom: 22px;
                }
                .otp-card {
                    background: #f8fafc;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 22px;
                    text-align: center;
                    margin: 24px 0;
                }
                .otp-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #64748b;
                    margin-bottom: 8px;
                }
                .otp-code {
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
                    font-size: 36px;
                    font-weight: 800;
                    letter-spacing: 8px;
                    color: #0f172a;
                }
                .notice {
                    font-size: 13px;
                    color: #64748b;
                    line-height: 1.5;
                    margin-top: 16px;
                    margin-bottom: 24px;
                }
                .signoff {
                    font-size: 14px;
                    color: #334155;
                    line-height: 1.5;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 18px;
                }
                .footer {
                    text-align: center;
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 24px;
                    line-height: 1.4;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1 class='brand-title'>GST REPOTIS</h1>
                    <p class='brand-subtitle'>Financial Intelligence & Tax Automation Infrastructure</p>
                </div>

                <div class='greeting'>Hello {$safeName},</div>

                <div class='text'>Your GST REPOTIS login verification code is:</div>

                <div class='otp-card'>
                    <div class='otp-label'>Verification Code</div>
                    <div class='otp-code'>{$safeOtp}</div>
                </div>

                <div class='notice'>
                    This code expires in <strong>5 minutes</strong>.<br/>
                    If you did not attempt to sign in, you can ignore this email.
                </div>

                <div class='signoff'>
                    Regards,<br/>
                    <strong>GST REPOTIS</strong>
                </div>

                <div class='footer'>
                    &copy; {$year} GST REPOTIS. Automated Bank Statement & GSTR-1 Infrastructure. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
