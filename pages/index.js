import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>image api</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <ul>
          <li>/api/logo</li>
          <li>/api/image?birth=1991-06=21&lineColor=red</li>
        </ul>
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
}
