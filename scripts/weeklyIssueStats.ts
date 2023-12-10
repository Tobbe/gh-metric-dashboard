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

// This is called a "branded type" in TypeScript. It's a string, but it's
// tagged with a special property that makes it different from a normal string.
// This is useful for making sure that we don't accidentally pass a normal
// string where a DateString is expected.
/**
 * A DateString is a string that we know is safe to pass to the GitHub API as a
 * date.
 */
type DateString = string & { __isDateString: true }

function formatDate(date: Date) {
  const month = ('0' + (date.getMonth() + 1)).slice(-2)
  const dayOfMonth = ('0' + date.getDate()).slice(-2)
  return `${date.getFullYear()}-${month}-${dayOfMonth}` as DateString
}

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
  const issues = issuesAndPrs.filter((issueOrPr) => !issueOrPr.pull_request)
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

  const issuesWithoutTopics: Array<number> = []
  const issueTopics: Record<string, Array<string>> = {}

  issues.forEach((issue) => {
    // console.log()
    // console.log('issue #', issue.number', 'labels', issue.labels)
    // console.log()
    if (!issue.labels || !issue.labels.length) {
      issuesWithoutTopics.push(issue)
    } else {
      let hasTopic = false

      issue.labels.forEach((label) => {
        if (label.name.startsWith('topic/')) {
          hasTopic = true

          if (!issueTopics[label.name]) {
            issueTopics[label.name] = []
          }

          issueTopics[label.name].push(issue)
        }
      })

      if (!hasTopic) {
        issuesWithoutTopics.push(issue.number)
      }
    }
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

  const issuesOpenedLastWeek = issues.length
  const issuesClosedLastWeek = closedIssuesAndPrs.length - closedPrs.length
  const p3IssuesLastWeek = p3IssuesAndPrs.filter(
    (issueOrPr) => !issueOrPr.pull_request
  ).length
  console.log('Issues opened last week', issuesOpenedLastWeek)
  console.log('Issues closed last week', issuesClosedLastWeek)
  console.log('Issues labeled p3 last week', p3IssuesLastWeek)
  console.log()
  console.log('Issue topics for last week')
  Object.entries(issueTopics).forEach(([topic, issues]) => {
    console.log(topic, issues.length)
  })
  console.log('Issues missing topics:', issuesWithoutTopics)

  // TODO:
  // - Median time it took to first reply to Issues opened previous week (Mon-Fri)
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
