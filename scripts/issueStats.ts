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

  const { data } = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:redwoodjs/redwood created:2022-11-01..2022-11-30`,
    per_page: 100, // 100 seems to be the max
  })

  console.log(
    'data',
    data.total_count,
    data.incomplete_results,
    data.items.length,
    data.items
      .map((item) => ({
        title: item.title,
        user: item.user.login,
        is_pr: !!item.pull_request && !!item.draft,
      }))
      .filter((item) => !CORE_TEAM.includes(item.user))
  )

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 12)
  startDate.setDate(1)

  for (let i = 0; i < 1; i++) {
    const start = new Date(startDate)
    start.setMonth(startDate.getMonth() + i)

    const end = new Date(start)
    // Add one month, and then subtract one day to get the last day of the
    // start month
    end.setMonth(start.getMonth() + 1)
    end.setDate(end.getDate() - 1)

    const range = formatDate(start) + '..' + formatDate(end)

    const { data } = await octokit.rest.search.issuesAndPullRequests({
      q: `is:issue repo:redwoodjs/redwood created:${range}`,
    })

    const filteredData = data.items.filter(
      (item) =>
        !CORE_TEAM.includes(item.user.login) &&
        !(item.pull_request && item.draft)
    )

    if (i === 0) {
      console.log(
        'filteredData',
        filteredData.map((item) => item.title)
      )
    }

    const month = monthName(start)
    const year = start.getFullYear()
    console.log(`PRs for ${month} ${year}`, filteredData.length)
  }
}
