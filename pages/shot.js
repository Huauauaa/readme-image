import dynamic from 'next/dynamic';
import Head from 'next/head';

const ShotClient = dynamic(() => import('../components/ShotClient'), { ssr: false });

export default function ShotPage() {
  return (
    <>
      <Head>
        <title>6s shot · three.js</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ShotClient />
    </>
  );
}
