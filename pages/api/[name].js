import fs from 'fs';
import path from 'path';

// ponytail: static map; grow when a new asset route appears
const ASSETS = {
  logo: ['hua.png', 'image/png'],
  avatar: ['avatar.png', 'image/png'],
  shangfen: ['shangfen.gif', 'image/gif'],
};

export default (req, res) => {
  const asset = ASSETS[req.query.name];
  if (!asset) {
    res.statusCode = 404;
    return res.end('Not Found');
  }
  const [file, type] = asset;
  res.setHeader('Content-Type', type);
  res.end(fs.readFileSync(path.resolve('./assets', file)));
};
