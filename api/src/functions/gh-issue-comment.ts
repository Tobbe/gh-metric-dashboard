import fs from 'node:fs'

import type { APIGatewayEvent, Context } from 'aws-lambda'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
import { isSecuredGithubWebhook } from 'src/lib/webhook'

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  // Verify the secret
  if (!isSecuredGithubWebhook(event)) {
    logger.warn('Unauthorized request to webhook gh-issue-comment')
    return {
      statusCode: 401,
      body: 'Unauthorized',
    }
  }

  // Parse the payload
  const payload = JSON.parse(event.body)
  fs.writeFileSync(
    'gh-issue-comment.json',
    JSON.stringify(payload, undefined, 2)
  )

  if (payload.action === 'created') {
    // Have to create the issue if it doesn't exist because the webhooks may
    // arrive out of order
    const row = await db.issueComment.create({
      data: {
        Issue: {
          connectOrCreate: {
            create: {
              id: payload.issue.id,
              number: payload.issue.number,
              url: payload.issue.url,
              title: payload.issue.title,
              authorAssociation: payload.issue.author_association,
              createdAt: payload.issue.created_at,
              updatedAt: payload.issue.updated_at,
            },
            where: {
              id: payload.issue.id,
            },
          },
        },
        id: payload.comment.id,
        url: payload.comment.url,
        authorAssociation: payload.comment.author_association,
        createdAt: payload.comment.created_at,
        updatedAt: payload.comment.updated_at,
      },
      select: {
        id: true,
        Issue: {
          select: {
            number: true,
          },
        },
      },
    })
    logger.info(`Issue comment created for issue #${row.Issue.number}`)
  }

  // Respond 200
  return {
    statusCode: 200,
    body: 'OK',
  }
}
