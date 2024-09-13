// app/api/fetch-metadata/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Make the request to the external URL
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch metadata" },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Return the fetched data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
