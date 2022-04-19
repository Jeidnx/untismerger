# Requests for raw endpoint

### Endpoint: /api/rawRequest

JWT needed.  
Arguments:  
`requestType` One of:

- getTimeTableFor
- getOwnTimeTable
- getTimeTableForRange
- getRooms
- getSubjects
- getClasses
- getHolidays

`requestData`: Default `{}`; Special for:

- getTimeTableFor: {date: string, id: int}
- getOwnTimeTableFor: {date: string}
- getTimeTableForRange: {rangeStart: string, rangeEnd: string, id: int}