import { Redirect } from "expo-router";

import { useAuth } from "@/src/providers/AuthProvider";

export default function Index() {
  const { isAuthenticated } = useAuth();

  return <Redirect href={isAuthenticated ? "/dashboard" : "/sign-in"} />;
}
