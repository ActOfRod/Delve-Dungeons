export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="dd-panel rounded-2xl p-8">
        <h1 className="font-display text-2xl text-gold">Almost ready to delve…</h1>
        <p className="mt-3 text-parchment/80">
          Delve Dungeons needs a Supabase project before adventurers can log in.
          Add your credentials to a <code className="text-ember">.env.local</code>{" "}
          file in the project root:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-gold/20 bg-black/40 p-4 text-sm text-parchment/90">
          {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-parchment/80">
          <li>
            Create a project at{" "}
            <a
              className="text-arcane-bright underline"
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
            >
              supabase.com
            </a>
            .
          </li>
          <li>
            Run the SQL in{" "}
            <code className="text-ember">supabase/migrations/0001_init.sql</code>{" "}
            using the Supabase SQL editor.
          </li>
          <li>
            Copy the project URL and anon key from{" "}
            <span className="text-parchment">Project Settings → API</span>.
          </li>
          <li>Restart the dev server.</li>
        </ol>
      </div>
    </div>
  );
}
