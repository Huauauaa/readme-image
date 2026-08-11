import Life from '../../src/Life';

export default (req, res) => {
  const life = new Life(req.query);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.writeHead(200, 'ok');
  res.write(life.svg, 'binary');
  res.end();
};
