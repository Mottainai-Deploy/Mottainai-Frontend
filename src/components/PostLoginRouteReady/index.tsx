import { useContext, useEffect } from "react";
import { RouteTransitionContext } from "@/context/RouteTransitionContext";
import type { PostLoginRouteReadyProps } from "@/types/post-login-route-ready.types";

function PostLoginRouteReady({ children }: PostLoginRouteReadyProps) {
  const { markPostLoginRouteReady } = useContext(RouteTransitionContext);

  useEffect(() => {
    markPostLoginRouteReady();
  }, [markPostLoginRouteReady]);

  return <>{children}</>;
}

export default PostLoginRouteReady;
