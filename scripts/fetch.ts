import { db } from 'api/src/lib/db'

export default async () => {
  try {
    // The github rest api only returns open issues so this is a hard coded list of the last 25 issues (open or closed)
    // as of when I wrote this script. If we wanted to properly seed all historical issues we can maybe just try all issue
    // numbers sequentially until we reach the highest known issue number at the time of running the script.
    const issueNumbers = [
      9373, 9356, 9355, 9352, 9323, 9321, 9320, 9316, 9313, 9304, 9297, 9287,
      9279, 9276, 9275, 9268, 9264, 9263, 9261, 9249, 9244, 9237, 9234, 9232,
      9209,
    ]

    for (const issueNumber of issueNumbers) {
      console.log(`Fetching issue #${issueNumber}`)

      // Get the issue
      const alreadyExists = await db.issue.findFirst({
        where: {
          number: issueNumber,
        },
        select: {
          number: true,
        },
      })
      if (alreadyExists?.number) {
        continue
      }
      let request = await fetch(
        `https://api.github.com/repos/redwoodjs/redwood/issues/${issueNumber}`,
        {
          headers: {
            accept: 'application/vnd.github+json',
            ['X-GitHub-Api-Version']: '2022-11-28',
          },
        }
      )
      let data = await request.json()
      const issue = await db.issue.create({
        data: {
          id: data.id,
          number: data.number,
          url: data.url,
          title: data.title,
          authorAssociation: data.author_association,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          closedAt: data.closed_at,
        },
        select: {
          id: true,
        },
      })

      // Get comments
      request = await fetch(
        `https://api.github.com/repos/redwoodjs/redwood/issues/${issueNumber}/comments`,
        {
          headers: {
            accept: 'application/vnd.github+json',
            ['X-GitHub-Api-Version']: '2022-11-28',
          },
        }
      )
      data = await request.json()
      for (const comment of data) {
        const alreadyExists = await db.issueComment.findFirst({
          where: {
            id: comment.id,
          },
          select: {
            id: true,
          },
        })
        if (alreadyExists?.id) {
          continue
        }
        await db.issueComment.create({
          data: {
            id: comment.id,
            Issue: {
              connect: {
                id: issue.id,
              },
            },
            authorAssociation: comment.author_association,
            url: comment.url,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
          },
        })
      }

      // Sleep for 5 second to avoid rate limiting - probably overkill but it's not like we're in a hurry
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  } catch (error) {
    console.error(error)
  }
}
