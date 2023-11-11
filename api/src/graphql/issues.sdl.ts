export const schema = gql`
  type IssueStatistics {
    from: DateTime!
    to: DateTime!
    responseTargetTracker: ResponseTargetTracker!
    responseTargetChart: ResponseTargetChart!
    closeTimeTracker: CloseTimeTracker!
    closeTimeChart: CloseTimeChart!
  }

  type ResponseTargetTracker {
    metric: Float!
    items: [ResponseTargetTrackerItem!]!
  }
  type ResponseTargetTrackerItem {
    color: String!
    tooltip: String!
  }

  type ResponseTargetChart {
    data: [ResponseTargetChartData!]!
  }
  type ResponseTargetChartData {
    name: String!
    value: Float!
    color: String!
    _type: String!
  }

  type CloseTimeTracker {
    metric: Float!
    items: [CloseTimeTrackerItem!]!
  }
  type CloseTimeTrackerItem {
    color: String!
    tooltip: String!
  }

  type CloseTimeChart {
    data: [CloseTimeChartData!]!
  }
  type CloseTimeChartData {
    name: String!
    value: Float!
    color: String!
    _type: String!
  }

  type Query {
    issueStatistics(from: DateTime, to: DateTime): IssueStatistics! @skipAuth
  }
`
