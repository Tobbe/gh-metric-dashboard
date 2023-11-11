import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

function getFormattedDelay(delay: number) {
  const delayMinues = delay / (1000 * 60)
  if (delayMinues < 60) {
    return `${delayMinues.toFixed(2)}m`
  }
  const delayHours = delayMinues / 60
  if (delayHours < 24) {
    return `${delayHours.toFixed(2)}h`
  }
  const delayDays = delayHours / 24
  return `${delayDays.toFixed(2)}d`
}

export const issueStatistics: QueryResolvers['issueStatistics'] = async ({
  from,
  to,
}) => {
  const issues = await db.issue.findMany({
    where: {
      AND: [
        {
          createdAt: {
            gte: from,
          },
        },
        {
          createdAt: {
            lte: to,
          },
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      comments: true,
    },
  })

  const targetChartData = []
  let trackerMetric = 0
  const trackerItems = []

  const closeChartData = []
  let closeMetric = 0
  const closeItems = []

  // TODO: Sometimes authorAssociation isn't enough, e.g. Josh-Walker-GM was a CONTRIBUTOR on one respsone
  //       We likely need to just have a list of core team members logins and check against that

  for (const issue of issues) {
    const isCoreTeamIssue =
      issue.authorAssociation === 'MEMBER' ||
      issue.authorAssociation === 'COLLABORATOR' ||
      issue.authorAssociation === 'OWNER'

    const issueAge = new Date().getTime() - issue.createdAt.getTime()
    const issueIsOlderThan24Hours = issueAge > 24 * 60 * 60 * 1000
    const issueIsOlderThan7Days = issueAge > 7 * 24 * 60 * 60 * 1000
    const coreTeamComments = issue.comments
      .filter((comment) => {
        return (
          comment.authorAssociation === 'MEMBER' ||
          comment.authorAssociation === 'COLLABORATOR' ||
          comment.authorAssociation === 'OWNER'
        )
      })
      .sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime()
      })
    const hasCoreTeamComments = coreTeamComments.length > 0
    const firstCoreTeamCommentDelay = hasCoreTeamComments
      ? coreTeamComments[0].createdAt.getTime() - issue.createdAt.getTime()
      : issueAge

    // These 2x2 matrics of if statements are a bit ugly, but it's the easiest way to do it right now
    if (issue.closedAt) {
      const closeDelay = issue.closedAt.getTime() - issue.createdAt.getTime()
      if (closeDelay < 7 * 24 * 60 * 60 * 1000) {
        closeMetric += 1
        closeItems.push({
          color: 'emerald',
          tooltip: `#${issue.number} - ${getFormattedDelay(closeDelay)}`,
        })
        closeChartData.push({
          name: `#${issue.number}`,
          value: closeDelay,
          color: 'emerald',
          _type: 'good',
        })
      } else {
        closeItems.push({
          color: 'rose',
          tooltip: `#${issue.number} - ${getFormattedDelay(closeDelay)}`,
        })
        closeChartData.push({
          name: `#${issue.number}`,
          value: closeDelay,
          color: 'rose',
          _type: 'bad',
        })
      }
    } else {
      if (issueIsOlderThan7Days) {
        closeItems.push({
          color: 'rose',
          tooltip: `#${issue.number} - waiting ${getFormattedDelay(issueAge)}`,
        })
        closeChartData.push({
          name: `#${issue.number} [waiting]`,
          value: issueAge,
          color: 'rose',
          _type: 'bad',
        })
      } else {
        closeItems.push({
          color: 'yellow',
          tooltip: `#${issue.number} - waiting ${getFormattedDelay(issueAge)}`,
        })
        closeChartData.push({
          name: `#${issue.number} [waiting]`,
          value: issueAge,
          color: 'yellow',
          _type: 'waiting',
        })
      }
    }

    if (isCoreTeamIssue) {
      trackerMetric += 1
      trackerItems.push({
        color: 'blue',
        tooltip: `#${issue.number} - Core Team`,
      })
      targetChartData.push({
        name: `#${issue.number}`,
        value: 0,
        color: 'blue',
        _type: 'core-team',
      })
      continue
    }

    // These 2x2 matrics of if statements are a bit ugly, but it's the easiest way to do it right now
    if (issueIsOlderThan24Hours) {
      if (hasCoreTeamComments) {
        if (firstCoreTeamCommentDelay < 24 * 60 * 60 * 1000) {
          trackerMetric += 1
          trackerItems.push({
            color: 'emerald',
            tooltip: `#${issue.number} - ${getFormattedDelay(
              firstCoreTeamCommentDelay
            )}`,
          })
          targetChartData.push({
            name: `#${issue.number}`,
            value: firstCoreTeamCommentDelay,
            color: 'emerald',
            _type: 'good',
          })
        } else {
          trackerItems.push({
            color: 'rose',
            tooltip: `#${issue.number} - ${getFormattedDelay(
              firstCoreTeamCommentDelay
            )}`,
          })
          targetChartData.push({
            name: `#${issue.number}`,
            value: firstCoreTeamCommentDelay,
            color: 'rose',
            _type: 'bad',
          })
        }
      } else {
        trackerItems.push({
          color: 'rose',
          tooltip: `#${issue.number} - waiting ${getFormattedDelay(issueAge)}`,
        })
        targetChartData.push({
          name: `#${issue.number} [waiting]`,
          value: issueAge,
          color: 'rose',
          _type: 'bad',
        })
      }
    } else {
      if (hasCoreTeamComments) {
        trackerMetric += 1
        trackerItems.push({
          color: 'emerald',
          tooltip: `#${issue.number} - ${getFormattedDelay(
            firstCoreTeamCommentDelay
          )}`,
        })
        targetChartData.push({
          name: `#${issue.number}`,
          value: firstCoreTeamCommentDelay,
          color: 'emerald',
          _type: 'good',
        })
      } else {
        trackerItems.push({
          color: 'yellow',
          tooltip: `#${issue.number} - waiting ${getFormattedDelay(issueAge)}`,
        })
        targetChartData.push({
          name: `#${issue.number} [waiting]`,
          value: issueAge,
          color: 'yellow',
          _type: 'waiting',
        })
      }
    }
  }

  trackerMetric = (trackerMetric / issues.length) * 100
  trackerMetric ||= 0

  closeMetric = (closeMetric / issues.length) * 100
  closeMetric ||= 0

  return {
    from,
    to,
    responseTargetTracker: {
      metric: trackerMetric,
      items: trackerItems,
    },
    responseTargetChart: {
      data: targetChartData,
    },
    closeTimeTracker: {
      metric: closeMetric,
      items: closeItems,
    },
    closeTimeChart: {
      data: closeChartData,
    },
  }
}
