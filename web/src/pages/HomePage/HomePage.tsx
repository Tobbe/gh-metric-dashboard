import { Title, Grid, Col, Text, Divider } from '@tremor/react'

import { MetaTags } from '@redwoodjs/web'

import IssueStatistics from 'src/components/IssueStatistics/IssueStatistics'

const HomePage = () => {
  return (
    <>
      <MetaTags title="Home" description="Home page" />

      <main>
        <Title>RedwoodJS GitHub Metrics</Title>
        <Text>
          Some quick insights into the activity of the RedwoodJS GitHub
          repository.
        </Text>

        <Divider />

        <Grid numItemsLg={1} className="mt-6 gap-6">
          <Col numColSpanLg={1}>
            <IssueStatistics />
          </Col>
        </Grid>
      </main>
    </>
  )
}

export default HomePage
