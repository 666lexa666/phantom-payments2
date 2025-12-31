const names = [
  "ivan","anna","alex","maria","sergey","dmitry","nikita","olga","irina","pavel",
  "andrey","roman","artem","egor","vlad","maksim","denis","kirill","timur","ilia"
];

const surnames = [
  "ivanov","petrov","smirnov","kuznetsov","popov","vasiliev","novikov",
  "morozov","volkov","fedorov","mihailov","belov","tarasov","orlov","zaitsev"
];

const domains = [
  "gmail.com",
  "mail.com",
  "icloud.com"
];

const separators = ["", ".", "_"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCustomerEmail() {
  const name = pick(names);
  const surname = pick(surnames);
  const separator = pick(separators);
  const domain = pick(domains);
  const number = Math.floor(Math.random() * 10000); // 0–9999

  return `${name}${separator}${surname}${number}@${domain}`;
}
