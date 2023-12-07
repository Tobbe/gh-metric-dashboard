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
]

function monthName(date: Date) {
  const { format } = new Intl.DateTimeFormat('en-US', { month: 'long' })
  return format(new Date(date))
}

type DateString = string & { __isDateString: true }

function formatDate(date: Date) {
  const month = ('0' + (date.getMonth() + 1)).slice(-2)
  const dayOfMonth = ('0' + date.getDate()).slice(-2)
  return `${date.getFullYear()}-${month}-${dayOfMonth}` as DateString
}

// Stats we want:
// - Number of PRs opened previous week
// - Number of PRs opened previous week by core team
// - Number of PRs merged previous week
// - Number of PRs closed previous week
// - Number of Issues opened previous week
// - Number of Issues closed previous week
// - Number of Issues closed + p3 previous week
// - The topics of the Issues opened previous week
// - Median time it took to first reply to Issues opened previous week (Mon-Fri)

export default async () => {
  console.log()

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const lastWeek = getLastWeek()

  const issuesAndPrs = await getIssuesAndPRs(octokit, {
    state: 'created',
    startDate: lastWeek.start,
    endDate: lastWeek.end,
  })

  const prs = issuesAndPrs.filter((issueOrPr) => !!issueOrPr.pull_request)
  const coreTeamPrs = prs.filter((pr) => CORE_TEAM.includes(pr.user.login))

  const closedIssuesAndPrs = await getIssuesAndPRs(octokit, {
    state: 'closed',
    startDate: lastWeek.start,
    endDate: lastWeek.end,
  })

  const closedPrs = closedIssuesAndPrs.filter(
    (issueOrPr) => !!issueOrPr.pull_request
  )
  const closedCoreTeamPrs = closedPrs.filter((pr) =>
    CORE_TEAM.includes(pr.user.login)
  )

  const p3IssuesAndPrs = await getIssuesAndPRs(octokit, {
    state: 'updated',
    startDate: lastWeek.start,
    endDate: lastWeek.end,
    label: 'p3',
  })

  console.log()
  console.log(
    `PRs and Issues for last week (${lastWeek.start} to ${lastWeek.end})`,
    issuesAndPrs.length
  )

  console.log()
  console.log('PRs opened last week', prs.length)
  console.log('PRs by the Core Team opened last week', coreTeamPrs.length)

  console.log('PRs closed last week', closedPrs.length)
  console.log('PRs by the Core Team closed last week', closedCoreTeamPrs.length)

  const issuesOpenedLastWeek = issuesAndPrs.length - prs.length
  const issuesClosedLastWeek = closedIssuesAndPrs.length - closedPrs.length
  const p3IssuesLastWeek = p3IssuesAndPrs.filter(
    (issueOrPr) => !issueOrPr.pull_request
  ).length
  console.log('Issues opened last week', issuesOpenedLastWeek)
  console.log('Issues closed last week', issuesClosedLastWeek)
  console.log('Issues labeled p3 last week', p3IssuesLastWeek)
  console.log()
}

function getLastWeek() {
  const end = new Date()
  // dayOfWeek, 1 (mon) to 7 (sun)
  const dayOfWeek = end.getDay() || 7
  // This will make endDate Sunday last week
  end.setDate(end.getDate() - dayOfWeek)

  const start = new Date(end)
  // startDate starts out as Sunday (since we initialize it with endDate), so
  // subtract 6 days to make it Monday
  start.setDate(start.getDate() - 6)

  // Now we have startDate and endDate, which are Monday and Sunday of last
  // week
  return { start: formatDate(start), end: formatDate(end) }
}

interface Options {
  state: 'created' | 'closed' | 'merged' | 'updated'
  is?: 'open' | 'closed' | 'merged'
  label?: string
  startDate: DateString
  endDate: DateString
}
async function getIssuesAndPRs(
  octokit: Octokit,
  { state, label, startDate, endDate }: Options
) {
  const range = startDate + '..' + endDate
  const labelQuery = label ? ` label:${label}` : ''
  const query = `repo:redwoodjs/redwood ${state}:${range}${labelQuery}`

  console.log(`Running query \`${query}\`...`)

  const iterator = octokit.paginate.iterator(
    octokit.rest.search.issuesAndPullRequests,
    // 100 per page is the max we're allowed to do
    { q: query, per_page: 100 }
  )

  const issuesAndPrs = []

  for await (const page of iterator) {
    for (const issueOrPr of page.data) {
      const issue = await octokit.rest.issues.get({
        owner: 'redwoodjs',
        repo: 'redwood',
        issue_number: issueOrPr.number,
      })
      issuesAndPrs.push(issue.data)
    }
  }

  return issuesAndPrs
}
