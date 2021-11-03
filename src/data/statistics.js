// localStorage.getItem('jwt')
var items = [];
$.post("/getStats", {jwt: localStorage.getItem('jwt')}, function (data) {
    try {
        const d = data;
        if(d.error) {
            $("#visualize").text(d.message);
            console.log("ERROR:");
            console.log(d.message);
            return;
        }
        const users = d.users;
        const days = d.requests;
        $("#registered").text(users);
        for(const k in days) {
            if(days.hasOwnProperty(k)) {
                const day = days[k];
                const count = day.get["/"] +day.get["/setup"] + day.get["*"] + day.post["/setup"] + day.post["/getTimeTable"];
                items.push({x: k, y: count});
            }
        }


        var container = document.getElementById("visualize");

        var dataset = new vis.DataSet(items);
        var options = {
            start: "2021-11-01",
            end: getDate(),
        };
        var graph2d = new vis.Graph2d(container, dataset, options);


    } catch (e) {console.log(e)}
})






function getDate() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}
document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '/';
});