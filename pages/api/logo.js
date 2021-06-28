import fs from 'fs';
import path from 'path';

export default (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  const content = fs.readFileSync(path.resolve('./assets/hua.png'), 'binary');
  res.writeHead(200, 'ok');
  res.write(content, 'binary');
  res.end();
};
