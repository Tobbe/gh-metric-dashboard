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
]

function monthName(date: Date) {
  const { format } = new Intl.DateTimeFormat('en-US', { month: 'long' })
  return format(new Date(date))
}

function formatDate(date: Date) {
  const month = ('0' + (date.getMonth() + 1)).slice(-2)
  const dayOfMonth = ('0' + date.getDate()).slice(-2)
  return `${date.getFullYear()}-${month}-${dayOfMonth}`
}

export default async () => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 12)
  startDate.setDate(1)

  for (let i = 0; i < 12; i++) {
    const start = new Date(startDate)
    start.setMonth(startDate.getMonth() + i)

    const end = new Date(start)
    // Add one month, and then subtract one day to get the last day of the
    // start month
    end.setMonth(start.getMonth() + 1)
    end.setDate(end.getDate() - 1)

    const range = formatDate(start) + '..' + formatDate(end)

    const iterator = octokit.paginate.iterator(
      octokit.rest.search.issuesAndPullRequests,
      {
        q: `is:pr repo:redwoodjs/redwood created:${range}`,
        per_page: 100, // 100 seems to be the max
      }
    )

    const issuesAndPrs = []

    for await (const page of iterator) {
      for (const issueOrPr of page.data) {
        if (
          CORE_TEAM.includes(issueOrPr.user.login) ||
          issueOrPr.user.login.endsWith('[bot]') ||
          issueOrPr.draft
        ) {
          continue
        }

        issuesAndPrs.push({
          title: issueOrPr.title,
          user: issueOrPr.user.login,
          is_pr: !!issueOrPr.pull_request,
        })
      }
    }

    const month = monthName(start)
    const year = start.getFullYear()
    console.log(`PRs for ${month} ${year}`, issuesAndPrs.length)
  }
}
