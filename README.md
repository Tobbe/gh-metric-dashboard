# gh-metric-dashboard

**Work In Progress**

1. `yarn rw prisma migrate dev`
2. `yarn rw exec fetch` - will take a minute or so
3. `yarn rw dev`

Step 2 fetches an example set of data from the github rest api. There are api functions to handle webhook events which are intended to be the main way of receiving data.
