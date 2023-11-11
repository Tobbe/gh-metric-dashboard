import {
  CheckCircleIcon,
  MinusCircleIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/solid'
import {
  Col,
  Card,
  Flex,
  Title,
  Icon,
  Tracker,
  Text,
  BarList,
} from '@tremor/react'
import type { IssueStatisticsQuery } from 'types/graphql'

import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'

export const QUERY = gql`
  query IssueStatisticsQuery($from: DateTime!, $to: DateTime!) {
    issueStatistics(from: $from, to: $to) {
      from
      to
      responseTargetTracker {
        metric
        items {
          color
          tooltip
        }
      }
      responseTargetChart {
        data {
          name
          value
          color
          _type
        }
      }
      closeTimeTracker {
        metric
        items {
          color
          tooltip
        }
      }
      closeTimeChart {
        data {
          name
          value
          color
          _type
        }
      }
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => (
  <Col numColSpanLg={1}>
    <Card>
      <Flex justifyContent="center" alignItems="center">
        <Text>No data</Text>
      </Flex>
    </Card>
  </Col>
)
export const isEmpty = (props: CellSuccessProps<IssueStatisticsQuery>) =>
  props.issueStatistics.closeTimeTracker.items.length === 0

export const Failure = ({ error }: CellFailureProps) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({
  issueStatistics: {
    from,
    to,
    responseTargetTracker,
    responseTargetChart,
    closeTimeTracker,
    closeTimeChart,
  },
}: CellSuccessProps<IssueStatisticsQuery>) => {
  const valueFormatter = (delay) => {
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

  for (const item of responseTargetChart.data) {
    switch (item._type) {
      case 'good':
        item['icon'] = () => (
          <Icon
            icon={CheckCircleIcon}
            // @ts-expect-error: need to have color be typed to tremor colors
            color={item.color}
            className="mr-4 h-[20px] w-[20px] "
          />
        )
        break
      case 'bad':
        item['icon'] = () => (
          <Icon
            icon={XCircleIcon}
            // @ts-expect-error: need to have color be typed to tremor colors
            color={item.color}
            className="mr-4 h-[20px] w-[20px] "
          />
        )
        break
      case 'waiting':
        item['icon'] = () => (
          <Icon
            icon={MinusCircleIcon}
            // @ts-expect-error: need to have color be typed to tremor colors
            color={item.color}
            className="mr-4 h-[20px] w-[20px] "
          />
        )
        break
      case 'core-team':
        item['icon'] = () => (
          <Icon
            icon={UserCircleIcon}
            // @ts-expect-error: need to have color be typed to tremor colors
            color={item.color}
            className="mr-4 h-[20px] w-[20px] "
          />
        )
        break
      default:
        item['icon'] = () => (
          <Icon
            icon={QuestionMarkCircleIcon}
            // @ts-expect-error: need to have color be typed to tremor colors
            color={item.color}
            className="mr-4 h-[20px] w-[20px] "
          />
        )
    }
  }

  return (
    <>
      <Col numColSpanLg={3}>
        <Card>
          <Flex>
            <Title className="w-full">24h Response Target</Title>
            <Flex justifyContent="end" className="-mr-2 -space-x-2">
              <Icon icon={CheckCircleIcon} color="emerald" tooltip="< 24h" />
              <Icon icon={MinusCircleIcon} color="yellow" tooltip="Waiting" />
              <Icon icon={UserCircleIcon} color="blue" tooltip="Core Team" />
              <Icon icon={XCircleIcon} color="rose" tooltip="> 24h" />
            </Flex>
          </Flex>
          <Flex className="mt-4" justifyContent="end">
            <Text>{responseTargetTracker.metric.toFixed(2)}%</Text>
          </Flex>
          <Tracker
            // @ts-expect-error: need to have color be typed to tremor colors
            data={responseTargetTracker.items}
            className="mt-2"
          />
          <Flex className="mt-2">
            <Text>{new Date(to).toLocaleDateString()}</Text>
            <Text>{new Date(from).toLocaleDateString()}</Text>
          </Flex>
        </Card>
      </Col>
      <Col numColSpanLg={3}>
        <Card>
          <Title>Response Times</Title>
          <BarList
            data={responseTargetChart.data}
            valueFormatter={valueFormatter}
            className="mt-2"
          />
        </Card>
      </Col>
      <Col numColSpanLg={3}>
        <Card>
          <Flex>
            <Title className="w-full">1w Closing Target</Title>
            <Flex justifyContent="end" className="-mr-2 -space-x-2">
              <Icon icon={CheckCircleIcon} color="emerald" tooltip="< 1w" />
              <Icon icon={MinusCircleIcon} color="yellow" tooltip="Waiting" />
              <Icon icon={XCircleIcon} color="rose" tooltip="> 1w" />
            </Flex>
          </Flex>
          <Flex className="mt-4" justifyContent="end">
            <Text>{closeTimeTracker.metric.toFixed(2)}%</Text>
          </Flex>
          {/* @ts-expect-error: need to have color be typed to tremor colors */}
          <Tracker data={closeTimeTracker.items} className="mt-2" />
          <Flex className="mt-2">
            <Text>{new Date(to).toLocaleDateString()}</Text>
            <Text>{new Date(from).toLocaleDateString()}</Text>
          </Flex>
        </Card>
      </Col>
      <Col numColSpanLg={3}>
        <Card>
          <Title>Close Times</Title>
          <BarList
            data={closeTimeChart.data}
            valueFormatter={valueFormatter}
            className="mt-2"
          />
        </Card>
      </Col>
    </>
  )
}
