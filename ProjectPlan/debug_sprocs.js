const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.resolve(__dirname, 'Gayatri-Portal-DB-script.txt'), 'utf8');
const blocks = text.split(/CREATE TABLE \[dbo\]\.\[/);
console.log('split count:', blocks.length);
console.log('firstBlock length:', blocks[0].length);
if (blocks.length > 1) {
  console.log('firstBlock sample:', JSON.stringify(blocks[1].slice(0, 120)));
  const firstLine = blocks[1].split(/\r?\n/)[0];
  console.log('firstLine:', JSON.stringify(firstLine));
  const nameMatch = firstLine.match(/^([^\]]+)\]/);
  console.log('nameMatch:', nameMatch ? nameMatch[1] : null);
  const rest = blocks[1].slice(nameMatch[0].length);
  console.log('rest indexOf ) ON [PRIMARY]:', rest.indexOf(') ON [PRIMARY]'));
  const colsText = rest.slice(0, rest.indexOf(') ON [PRIMARY]'));
  console.log('colsText starts:', JSON.stringify(colsText.slice(0, 120)));
}
