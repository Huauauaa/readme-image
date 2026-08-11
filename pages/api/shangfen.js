import fs from 'fs';
import path from 'path';

export default (req, res) => {
  res.setHeader('Content-Type', 'image/gif');
  const content = fs.readFileSync(path.resolve('./assets/shangfen.gif'), 'binary');
  res.writeHead(200, 'ok');
  res.write(content, 'binary');
  res.end();
};
