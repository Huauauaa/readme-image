import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { Table } from 'react-bootstrap';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>image api</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>#</th>
              <th>Query Param</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/api/logo</td>
              <td></td>
            </tr>
            <tr>
              <td>/api/image?birth=1991-06=21&lineColor=red</td>
              <td>birth, lineColor, boxWidth, boxHeight, total</td>
            </tr>
          </tbody>
        </Table>
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
}
