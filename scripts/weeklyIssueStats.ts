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

function formatResponseTime(ms: number) {
  const hours = Math.round(ms / 3_600_000)

  if (hours > 0) {
    return hours + 'h'
  }

  return Math.round(ms / 360_000) + 'm'
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

  const responseTimes = []
  const responseTimesMF = []

  issues.forEach((issue) => {
    const createdAt = new Date(issue.created_at)
    const closedAt = issue.closed_at ? new Date(issue.closed_at) : undefined
    const firstReplyAt = issue.firstCoreTeamComment?.created_at
      ? new Date(issue.firstCoreTeamComment.created_at)
      : undefined

    // Ignore issues that were opened by core team members. The purpose of
    // tracking response times is to make sure that we're responding to
    // community members in a timely manner.
    if (CORE_TEAM.includes(issue.user.login)) {
      return
    }

    // If the issue is closed, and it was closed before the first reply (or if
    // there is no reply), then use the close time to calculate the response
    // time.
    if (
      closedAt &&
      (!firstReplyAt || closedAt.getTime() < firstReplyAt.getTime())
    ) {
      const responseTime = closedAt.getTime() - createdAt.getTime()
      responseTimes.push(responseTime)

      // Response time, Mon-Fri
      if (closedAt.getDay() !== 0 && closedAt.getDay() !== 6) {
        responseTimesMF.push(responseTime)
      }
    } else {
      if (!firstReplyAt) {
        responseTimes.push(-1)
      } else {
        // Response time in minutes
        const responseTime = firstReplyAt.getTime() - createdAt.getTime()
        responseTimes.push(responseTime)

        // Response time, Mon-Fri
        if (firstReplyAt.getDay() !== 0 && firstReplyAt.getDay() !== 6) {
          responseTimesMF.push(responseTime)
        }
      }
    }
  })

  const sumMF = responseTimesMF.reduce((a, b) => a + b, 0)
  const averageMF = sumMF / responseTimesMF.length

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
    console.log(' ', topic, issues.length)
  })
  console.log('Issues missing topics:', issuesWithoutTopics)
  console.log()
  console.log(
    'Response times last week',
    responseTimes.map((t) => formatResponseTime(t)).join(', ')
  )
  console.log('  Average Mon-Fri', formatResponseTime(averageMF))
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

      let firstCoreTeamComment = {}

      if (!issueOrPr.pull_request) {
        // TODO: Technically, we should paginate here, but for now, we'll just
        // get the first page of comments. Hopefully, the first comment by a
        // core team member will be on the first page.
        const comments = await octokit.rest.issues.listComments({
          owner: 'redwoodjs',
          repo: 'redwood',
          issue_number: issueOrPr.number,
          per_page: 30,
          page: 1,
        })

        firstCoreTeamComment = comments.data.find(
          (comment) => comment.user && CORE_TEAM.includes(comment.user.login)
        )
      }

      issuesAndPrs.push({ ...issue.data, firstCoreTeamComment })
    }
  }

  return issuesAndPrs
}
