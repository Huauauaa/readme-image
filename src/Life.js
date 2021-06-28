export default class Life {
  #birth;
  #total;
  #boxWidth;
  #boxHeight;
  #lineColor;

  constructor({
    birth = '2021-04',
    boxWidth = 20,
    boxHeight = 20,
    total = 90,
    lineColor = 'lightblue'
  }) {
    this.#birth = birth;
    this.#boxWidth = boxWidth;
    this.#boxHeight = boxHeight;
    this.#total = total;
    this.#lineColor = lineColor;
  }

  get age() {
    return Math.trunc(
      (new Date() - new Date(this.#birth)) / 1e3 / 60 / 60 / 24 / 365
    );
  }

  genRect({
    x,
    y,
    width = this.#boxWidth,
    height = this.#boxHeight,
    radius = 1,
    fillColor = 'transparent'
  }) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fillColor}" />`;
  }

  get svg() {
    const start = `<svg xmlns="http://www.w3.org/2000/svg" stroke="${
      this.#lineColor
    }" fill="transparent">`;
    let content = ``;

    let index = 0;

    while (index < this.#total) {
      content += this.genRect({
        x: (index % 10) * this.#boxWidth,
        y: Number.parseInt(index / 10) * this.#boxHeight,
        fillColor: index < this.age ? 'gray' : undefined
      });
      index += 1;
    }

    const end = `</svg>`;

    return `${start}${content}${end}`;
  }
}
