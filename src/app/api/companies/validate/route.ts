import { NextRequest, NextResponse } from 'next/server';
import { validateEmailMX } from '@/lib/validator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Missing or invalid emails array.' }, { status: 400 });
    }

    const results = await Promise.all(
      emails.map(async (email: string) => {
        const validation = await validateEmailMX(email);
        return {
          email,
          isValid: validation.isValid,
          error: validation.error,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
