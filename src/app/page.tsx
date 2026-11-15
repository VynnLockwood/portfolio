import { RepoList } from "../ui/RepoList";

export default function Page() {
  return (
    <main className="wrap">
      <div className="brandline">
        <img className="mark" src="/vynn-logo.png" alt="VynnLockwood" />
        <div className="word">VynnLockwood<small>by Myths of the Moon</small></div>
      </div>
      <p className="lede">Backend, data and AI engineer who builds quiet tools.</p>
      <RepoList visible />
      <footer className="foot">
        <a href="https://lunariankids.com">Lunarian Kids</a> · © 2026 Myths of the Moon
      </footer>
    </main>
  );
}
