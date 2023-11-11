import { useState } from 'react'

import {
  Col,
  DateRangePicker,
  DateRangePickerItem,
  DateRangePickerValue,
  Flex,
  Grid,
  Title,
} from '@tremor/react'

import IssueStatisticsCell from 'src/components/IssueStatisticsCell'

// This component is really an adhoc context type thing to give the cell a daterange
const IssueStatistics = () => {
  const defaultDateRange: Required<DateRangePickerValue> = {
    from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    to: new Date(),
    selectValue: '30d',
  }

  const [dateRange, setDateRange] = useState<DateRangePickerValue>({
    ...defaultDateRange,
  })

  return (
    <Grid numItemsLg={3} className="gap-6">
      <Col numColSpanLg={3}>
        <Flex
          justifyContent="evenly"
          alignItems="center"
          flexDirection="row"
          className="mx-auto min-w-full space-x-6"
        >
          <Title>Issues</Title>
          <Flex justifyContent="end">
            <DateRangePicker
              enableSelect={true}
              value={dateRange}
              onValueChange={setDateRange}
            >
              <DateRangePickerItem
                key="1d"
                value="1d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24)}
                to={new Date()}
              >
                Today
              </DateRangePickerItem>
              <DateRangePickerItem
                key="7d"
                value="7d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)}
                to={new Date()}
              >
                Last 7 days
              </DateRangePickerItem>
              <DateRangePickerItem
                key="30d"
                value="30d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)}
                to={new Date()}
              >
                Last 30 days
              </DateRangePickerItem>
              <DateRangePickerItem
                key="60d"
                value="60d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)}
                to={new Date()}
              >
                Last 60 days
              </DateRangePickerItem>
              <DateRangePickerItem
                key="90d"
                value="90d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24 * 90)}
                to={new Date()}
              >
                Last 90 days
              </DateRangePickerItem>
              <DateRangePickerItem
                key="180d"
                value="180d"
                from={new Date(Date.now() - 1000 * 60 * 60 * 24 * 180)}
                to={new Date()}
              >
                Last 180 days
              </DateRangePickerItem>
            </DateRangePicker>
          </Flex>
        </Flex>
      </Col>
      <IssueStatisticsCell
        from={(dateRange.from ?? defaultDateRange.from).toISOString()}
        to={(dateRange.to ?? defaultDateRange.to).toISOString()}
      />
    </Grid>
  )
}

export default IssueStatistics
