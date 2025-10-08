// app/login/page.tsx  (Server Component)
export const dynamic = "force-dynamic"; // chặn SSG cho route này
export const revalidate = 0; // OK vì ở server

import LoginClient from "./LoginClient";

export default function LoginPage() {
  return <LoginClient />;
}
