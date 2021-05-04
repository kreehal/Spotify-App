
let session = [
    { trackName: "!", artistName: "Samey", emotion: "Soothing" },
    { trackName: "(The Song Formerly Known As)", artistName: "Regurgitator", emotion: "Energetic" },
    { trackName: "!De Repente!", artistName: "Rosendo", emotion: "Energetic" },
    { trackName: "H.a.p.p.y", artistName: "Dawid Podsiad\u0142o", emotion: "Soothing" },
    { trackName: "I'll Be Back", artistName: "Ril\u00e8s", emotion: "Energetic" },
    { trackName: "...", artistName: "...", emotion: "..." }
];

function generateTableHead(table, data) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of data) {
    let th = document.createElement("th");
    let text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }
}

function generateTable(table, data) {
  for (let element of data) {
    let row = table.insertRow();
    for (key in element) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
    }
  }
}

let table = document.querySelector("table");
let data = Object.keys(session[0]);
generateTable(table, session);
generateTableHead(table, data);
