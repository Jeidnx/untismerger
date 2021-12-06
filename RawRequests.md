# Requests for raw endpoint

### Endpoint: /api/rawRequest
JWT needed.  
Arguments:  
`requestType` One of:
- getTimeTableFor
- getTimeTableForRange
- getRooms
- getSubjects
- getClasses
- getHolidays

`requestData`: Default `{}`; Special for:
- getTimeTableFor: {date: string, id: int}
- getTimeTableForRange: {rangeStart: string, rangeEnd: string, id: int}