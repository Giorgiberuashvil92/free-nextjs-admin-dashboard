import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import querystring from 'querystring';

const SMS_API_KEY = '65fa7f724d09ed5357688a00a643f657';

export async function GET(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const data = querystring.stringify({ apikey: SMS_API_KEY });

    const options = {
      hostname: 'sender.ge',
      path: '/api/getBalance.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk.toString();
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);

          if (result.data && result.data.balance !== undefined) {
            resolve(
              NextResponse.json({
                success: true,
                balance: parseFloat(result.data.balance),
                overdraft: result.data.overdraft ? parseFloat(result.data.overdraft) : 0,
              })
            );
          } else {
            resolve(
              NextResponse.json(
                {
                  success: false,
                  error: result.message || 'Unknown error',
                },
                { status: 404 }
              )
            );
          }
        } catch (error) {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: 'Failed to parse response',
              },
              { status: 500 }
            )
          );
        }
      });
    });

    req.on('error', (e) => {
      resolve(
        NextResponse.json(
          {
            success: false,
            error: e.message || 'Request failed',
          },
          { status: 500 }
        )
      );
    });

    req.write(data);
    req.end();
  });
}

