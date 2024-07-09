import { Octokit } from '@octokit/rest'

const CORE_TEAM = [
  'dthyresson',
  'cannikin',
  'Tobbe',
  'jtoar',
  'dac09',
  'Josh-Walker-GM',
  'ahaywood',
  'thedavidprice',
  'KrisCoulson',
  'orta',
  'arimendelow',
]

const HOUR_IN_MS = 60 * 60 * 1000

export default async () => {
  console.log()

  const octokit = new Octokit({
    auth: process.env.REDWOOD_GITHUB_TOKEN,
  })

  const prs = await getOpenPRs(octokit)
  const communityPrs = prs.filter(
    (pr) =>
      !CORE_TEAM.includes(pr.user.login) && pr.user.login !== 'renovate[bot]'
  )

  console.log()
  console.log('Open PRs:', prs.length)
  console.log('Community PRs:', communityPrs.length)

  communityPrs.forEach((pr) => {
    console.log()
    console.log('PR', pr.number, pr.title)
    console.log('Assigned to:', pr.assignee?.login || 'Unassigned')

    const lastComment = pr.comments.at(-1)

    if (CORE_TEAM.includes(lastComment?.user?.login)) {
      console.log('Waiting for PR author to respond')
      return
    }

    let waitingTimeMs: number

    if (!lastComment) {
      // No comment yet, definitely waiting for a Core Team member to respond.
      console.log('No comments yet')
      waitingTimeMs = new Date().getTime() - new Date(pr.created_at).getTime()
    } else {
      waitingTimeMs =
        new Date().getTime() - new Date(lastComment.created_at).getTime()
    }

    const waitingTimeHours = Math.round(waitingTimeMs / HOUR_IN_MS)

    if (waitingTimeHours > 48) {
      console.log('Waiting time:', Math.round(waitingTimeHours / 24), 'days')
    } else {
      console.log('Waiting time:', waitingTimeHours, 'hours')
    }
  })

  console.log()
}

async function getOpenPRs(octokit: Octokit) {
  const query = `repo:redwoodjs/redwood is:pr is:open`

  console.log(`Running query \`${query}\`...`)

  const iterator = octokit.paginate.iterator(
    octokit.rest.search.issuesAndPullRequests,
    // 100 per page is the max we're allowed to do
    { q: query, per_page: 100 }
  )

  const issuesAndPrs = []

  for await (const page of iterator) {
    for (const pageItem of page.data) {
      if (!pageItem.pull_request) {
        throw new Error('Expected a PR')
      }

      const pr = await octokit.rest.issues.get({
        owner: 'redwoodjs',
        repo: 'redwood',
        issue_number: pageItem.number,
      })

      // TODO: Technically, we should paginate here, but for now, we'll just
      // get the first page of comments. Hopefully there aren't more than 30
      // comments
      const comments = await octokit.rest.issues.listComments({
        owner: 'redwoodjs',
        repo: 'redwood',
        issue_number: pageItem.number,
        per_page: 30,
        page: 1,
      })

      if (comments.data && comments.data.length >= 30) {
        console.warn('PR has 30+ comments:', pr.data.number, pr.data.title)
        console.warn('Might be missing comments!')
        console.warn('We should add support for pagination.')
      }

      issuesAndPrs.push({ ...pr.data, comments: comments.data })
    }
  }

  return issuesAndPrs
}
