import crypto from 'node:crypto'

import type { APIGatewayEvent } from 'aws-lambda'

// This verification function is taken directly from the GitHub docs:
// https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
export function isSecuredGithubWebhook(event: APIGatewayEvent) {
  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(event.body)
    .digest('hex')
  const trusted = Buffer.from(`sha256=${signature}`, 'ascii')
  const untrusted = Buffer.from(event.headers['x-hub-signature-256'], 'ascii')
  return crypto.timingSafeEqual(trusted, untrusted)
}
