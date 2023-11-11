import fs from 'node:fs'

import type { APIGatewayEvent, Context } from 'aws-lambda'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
import { isSecuredGithubWebhook } from 'src/lib/webhook'

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  // Verify the secret
  if (!isSecuredGithubWebhook(event)) {
    logger.warn('Unauthorized request to webhook gh-issue')
    return {
      statusCode: 401,
      body: 'Unauthorized',
    }
  }

  // Parse the payload
  const payload = JSON.parse(event.body)
  fs.writeFileSync('gh-issue.json', JSON.stringify(payload, undefined, 2))

  if (payload.action === 'opened') {
    const row = await db.issue.create({
      data: {
        id: payload.issue.id,
        number: payload.issue.number,
        url: payload.issue.url,
        title: payload.issue.title,
        authorAssociation: payload.issue.author_association,
        createdAt: payload.issue.created_at,
        updatedAt: payload.issue.updated_at,
      },
      select: {
        number: true,
      },
    })
    logger.info(`Issue #${row.number} created`)
  } else if (payload.action === 'closed') {
    // TODO: In theory webhooks could be received out of order...
    const row = await db.issue.update({
      where: {
        id: payload.issue.id,
      },
      data: {
        closedAt: payload.issue.closed_at,
      },
      select: {
        number: true,
      },
    })
    logger.info(`Issue #${row.number} closed`)
  }

  // Respond 200
  return {
    statusCode: 200,
    body: 'OK',
  }
}
