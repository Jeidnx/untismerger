let items = [];
fetch('/api/getStats', {
    method: 'POST',
    body: new URLSearchParams({
        'jwt': localStorage.getItem("jwt")
    })
}).then(res => res.json()).then(json => {
    document.getElementById("registered").innerText = json.users;
    const days = json.requests;

    for(const k in days) {
        if(days.hasOwnProperty(k)) {
            const day = days[k];
            const count = day.getTimeTableWeek +day.setup + day.getStats + day.updateUserPrefs + day.vapidPublicKey + day.register;
            items.push({x: day.date, y: count});
        }
    }

    let container = document.getElementById("visualize");

    let dataset = new vis.DataSet(items);
    let options = {
        start: "2021-11-01",
        end: getDate(),
    };
    let graph2d = new vis.Graph2d(container, dataset, options);

}).catch(console.error);




function getDate() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}
document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '/';
});

//Push
document.getElementById("notificationForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("notificationText").value;
    let xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
        document.getElementById('notificationReturn').innerHTML = JSON.parse(xhr.response).message;
    })

    xhr.open("POST", "/api/sendNotification");
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(`text=${text}&jwt=${localStorage.getItem('jwt')}`);
})