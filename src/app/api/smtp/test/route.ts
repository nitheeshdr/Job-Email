import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, secure, authUser, authPass } = body;

    if (!host || !port || !authUser || !authPass) {
      return NextResponse.json({ error: 'Missing SMTP connection details.' }, { status: 400 });
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

    await transporter.verify();
    return NextResponse.json({ success: true, message: 'SMTP configurations verified successfully!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'SMTP Connection failed.' }, { status: 400 });
  }
}
