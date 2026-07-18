<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #090a0e;
            color: #ececec;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #120e0f;
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-top: 4px solid #d4af37;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
            background: linear-gradient(135deg, #120e0f, #1b1718);
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin: 0;
            font-weight: 800;
        }
        .header h1 span {
            color: #d4af37;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .content h2 {
            color: #ffffff;
            font-size: 20px;
            margin-top: 0;
        }
        .content p {
            color: #b8b3ab;
            font-size: 15px;
            margin: 0 0 20px;
        }
        .btn-wrapper {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 14px 30px;
            background: linear-gradient(135deg, #d4af37, #b8932a);
            color: #0e0c08 !important;
            font-weight: 700;
            font-size: 15px;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 6px 18px rgba(212, 175, 55, 0.25);
            transition: all 0.2s ease;
        }
        .footer {
            background-color: #0a0a0d;
            padding: 24px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 12px;
            color: #6e6860;
        }
        .footer a {
            color: #d4af37;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Coupe<span>na</span></h1>
        </div>
        <div class="content">
            <h2>Hello {{ $userName }},</h2>
            <p>You are receiving this email because we received a password reset request for your account.</p>
            <p>Click the button below to choose a new password. This link will expire in 60 minutes.</p>
            <div class="btn-wrapper">
                <a href="{{ $resetUrl }}" class="btn">Reset Password</a>
            </div>
            <p>If you did not request a password reset, no further action is required.</p>
            <p>Regards,<br>The Coupena Team</p>
        </div>
        <div class="footer">
            <p>If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:</p>
            <p style="word-break: break-all;"><a href="{{ $resetUrl }}">{{ $resetUrl }}</a></p>
            <p>&copy; {{ date('Y') }} Coupena. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
