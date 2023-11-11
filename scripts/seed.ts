import { db } from 'api/src/lib/db'

export default async () => {
  // This used to have hardcoded data but the fetch script is now responsible for
  // seeding the database. I didn't simply replace this file because I don't want
  // fetch to run automatically on prisma calls for example.
  try {
    const issues = []
    for (const issue of issues) {
      await db.issue.create({
        data: issue,
      })
    }

    const issueComments = []
    for (const issueComment of issueComments) {
      await db.issueComment.create({
        data: issueComment,
      })
    }
  } catch (error) {
    console.error(error)
  }
}
