/*
 *  List of emotions matched with the colors
 *
 *  Calm - #78D6C2
 *  Chill - #7EE171
 *  Energetic - #FF920C
 *  Powerful - #FF4500
 *  Sentimental - #3262BC
 *  Soothing - #0B6623
 *  Upbeat - #FFF675
 *  Vulnerable - #F2A0B9
 *  Wistful - #908CBD
 */

// Instantiate Bar Chart
const barChart = britecharts.bar();
const container = d3.select('.bar-container');
const colors = ['#ff920c', '#ff4500', '#0b6623',
     '#fff675', '#908cbd']

// Create Dataset with proper shape
// First entry appears last in the chart
const barData = [
    { name: 'Wistful', value: 2 },
    { name: 'Upbeat', value: 3 },
    { name: 'Soothing', value: 7},
    { name: 'Powerful', value: 4 },
    { name: 'Energetic', value: 5 }
];

// Configure chart
barChart
    .isAnimated(true)
    .colorSchema(colors)
    .enableLabels(true)
    .labelsNumberFormat('.0')
    .margin({ left: 100 })
    .isHorizontal(true)
    .height(200)
    .width(300);

container.datum(barData).call(barChart);