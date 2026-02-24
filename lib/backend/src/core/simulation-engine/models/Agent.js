import { createCanvas } from 'canvas';
import Chart from 'chart.js/auto';
import * as fs from 'fs';
function arr_sum(array) {
    let ans = 0;
    for (const num of array) {
        ans += num;
    }
    return ans;
}
function gen_arr_range(n) {
    return Array.from({ length: n }, (_, i) => i + 1);
}
class type_1 {
    constructor(low_bound = 0.3, high_bound = 0.3) {
        this.low_bound = low_bound;
        this.high_bound = high_bound;
    }
    predict(array, cap) {
        const pred = Math.random();
        const avg = arr_sum(array) / array.length;
        if (avg > cap) {
            if (pred > this.high_bound) {
                return true;
            }
            return false;
        }
        else {
            if (pred > this.low_bound) {
                return true;
            }
            return false;
        }
    }
}
function plotData(data1, data2, labels) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Simulation Results',
                        data: data1,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Average Results',
                        data: data2,
                        borderColor: 'rgb(192, 75, 192)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: { title: { display: true, text: 'Simulation vs Average' } }
            }
        });
    }
    const buffer = canvas.toBuffer('image/png');
    let filename = 'image.png';
    fs.writeFileSync(filename, buffer);
    console.log(`Saved chart to ${filename}`);
}
let cap = 50;
let num = 100;
let arr_users = [];
let arr_results = [];
let mass_avg = [];
arr_results.push(0);
let benefit = 0;
let max_benefit = cap * benefit;
let min_benefit = -num * 100;
for (let i = 0; i < num; ++i) {
    arr_users.push(new type_1(0.3, 0.7));
}
for (let i = 0; i < 100; ++i) {
    let res = 0;
    for (let j = 0; j < num; ++j) {
        if (arr_users[j].predict(arr_results, cap)) {
            res++;
        }
    }
    arr_results.push(res);
    mass_avg.push(arr_sum(arr_results) / arr_results.length);
    if (res <= cap) {
        benefit += res;
    }
    else {
        benefit -= res;
    }
}
plotData(arr_results, mass_avg, gen_arr_range(100));
console.log(max_benefit);
console.log('\n');
console.log(min_benefit);
//# sourceMappingURL=Agent.js.map