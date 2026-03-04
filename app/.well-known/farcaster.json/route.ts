import { NextRequest, NextResponse } from 'next/server'

import { appUrl, appDescription, appName } from '@/lib/metadata'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const baseUrl = origin

  let accountAssociation = {}

  const manifest = {
    accountAssociation,
    frame: {
      name: appName,
      version: '1',
      iconUrl: baseUrl + '/icon',
      homeUrl: baseUrl,
      splashImageUrl: baseUrl + '/icon?rounded=1',
      splashBackgroundColor: '#111111',
      primaryCategory: 'social',
      subtitle: appDescription,
      description: appDescription,
      webhookUrl: baseUrl + '/webhook',
      castShareUrl: baseUrl,
      canonicalDomain: 'sonarr.cc',
    },
  }
  return Response.json(manifest)
}
