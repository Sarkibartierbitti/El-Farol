import {createCanvas} from 'canvas';
import Chart from 'chart.js/auto'
import * as fs from 'fs';


function arr_sum(array: number[]): number {
  let ans: number = 0;
  for (const num of array) {
    ans += num;
  }
  return ans;
}

function gen_arr_range(n: number): number[] {
  return Array.from({length: n}, (_, i) => i + 1);
}

class type_1 {
  low_bound: number;
  high_bound: number;

  constructor(low_bound: number = 0.3, high_bound: number = 0.3) {
    this.low_bound = low_bound;
    this.high_bound = high_bound;
  }

  predict(array: number[], cap: number): boolean {
    const pred: number = Math.random();
    const avg = arr_sum(array) / array.length;
    if (avg > cap) {
      if (pred > this.high_bound) {
        return true;
      }
      return false;
    } else {
      if (pred > this.low_bound) {
        return true;
      }
      return false;
    }
  }
}

function plotData(data1: number[], data2: number[], labels: number[]) {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d') as any

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
        responsive: false,  // Node-canvas is fixed size
        plugins: {title: {display: true, text: 'Simulation vs Average'}}
      }
    });
  }

  const buffer = canvas.toBuffer('image/png');
  let filename: string = 'image.png'
  fs.writeFileSync(filename, buffer);

  console.log(`Saved chart to ${filename}`);
}


let cap: number = 50;
let num: number = 100;

let arr_users: type_1[] = [];
let arr_results: number[] = [];

let mass_avg: number[] = [];

arr_results.push(0);

let benefit: number = 0;
let max_benefit: number = cap * benefit;
let min_benefit: number = -num * 100;

for (let i = 0; i < num; ++i) {
  arr_users.push(new type_1(0.3, 0.7));
}

for (let i = 0; i < 100; ++i) {
  let res: number = 0;
  for (let j = 0; j < num; ++j) {
    if (arr_users[j]!.predict(arr_results, cap)) {
      res++;
    }
  }
  arr_results.push(res);
  mass_avg.push(arr_sum(arr_results) / arr_results.length);

  if (res <= cap) {
    benefit += res;
  } else {
    benefit -= res;
  }
}

plotData(arr_results, mass_avg, gen_arr_range(100));
console.log(max_benefit);
console.log('\n');
console.log(min_benefit);