import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { smtpConfig, to, subject, text, html, attachResume } = body;

    if (!smtpConfig || !to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const { host, port, secure, authUser, authPass } = smtpConfig;

    if (!host || !port || !authUser || !authPass) {
      return NextResponse.json({ error: 'Missing SMTP credentials in configuration.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465 ? true : (Number(port) === 587 ? false : secure === true),
      auth: {
        user: authUser,
        pass: authPass.replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions: any = {
      from: `"${authUser.split('@')[0]}" <${authUser}>`,
      to,
      subject,
      text: text || '',
      html: html || (text ? text.replace(/\n/g, '<br>') : ''),
    };

    if (attachResume) {
      const resumePath = path.join(process.cwd(), 'uploads', 'resume.pdf');
      if (fs.existsSync(resumePath)) {
        mailOptions.attachments = [
          {
            filename: attachResume === true ? 'Resume.pdf' : String(attachResume),
            path: resumePath,
          },
        ];
      }
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Email sent successfully!' });
  } catch (error: any) {
    console.error('SMTP sending error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send email.' }, { status: 400 });
  }
}
