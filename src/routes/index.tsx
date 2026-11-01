import { lazy, Suspense, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import PrivateRoute from "@/pages/PrivateRoute";
import RouteLoadErrorBoundary from "@/components/RouteLoadErrorBoundary";
import Loading from "@/components/Loading";
import PostLoginLoading from "@/components/PostLoginLoading";
import PostLoginRouteReady from "@/components/PostLoginRouteReady";
import { RouteTransitionContext } from "@/context/RouteTransitionContext";
import FloatingButton from "@/components/FloatingButton";
import { loadModuleWithMinimumDuration } from "@/utils/loadModuleWithMinimumDuration";
import { MINIMUM_LOADING_DURATION_MS } from "@/utils/minimumLoadingDuration";
import type { RouteTransitionContextValue, RouteTransitionState } from "@/types/route-transition.types";
import styles from "./style.module.css";

function hasPostLoginLoadingMarker(state: unknown): boolean {
  return typeof state === "object"
    && state !== null
    && "showPostLoginLoading" in state
    && state.showPostLoginLoading === true;
}

const MainLayout = lazy(() => loadModuleWithMinimumDuration(() => import("@/components/MainLayout")));
const Home = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Home")));
const Login = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Login")));
const ErrorPage = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/ErrorPage")));
const Overview = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Overview")));
const Users = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Users")));
const ExpiringProducts = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/ExpiringProducts")));
const PasswordRecovery = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/PasswordRecovery")));
const UsageHistory = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/UsageHistory")));
const ProductsRegistration = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/ProductsRegistration")));
const NewPassword = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/NewPassword")));
const Products = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Products")));
const ProductDetails = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/ProductDetails")));
const ManagementReports = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/ManagementReports")));
const AccountingSped = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/AccountingSped")));
const Stock = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Stock")));
const CashClosingReport = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/CashClosingReport")));
const NewStockCount = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/NewStockCount")));
const StockTransfers = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/StockTransfers")));
const NewTransfer = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/NewTransfer")));
const Suppliers = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Suppliers")));
const SupplierForm = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/SupplierForm")));
const StockAdjustments = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/StockAdjustments")));
const Account = lazy(() => loadModuleWithMinimumDuration(() => import("@/pages/Account")));

function RouteSuspenseFallback() {
  const { isTransitioning } = useContext(RouteTransitionContext);

  if (isTransitioning) return null;
  return <Loading />;
}

function page(element: ReactNode, onLoadError?: () => void) {
  // Cada rota mantém a composição do Figma enquanto seu módulo é carregado.
  return (
      <RouteLoadErrorBoundary onError={onLoadError}>
      <Suspense fallback={<RouteSuspenseFallback />}>{element}</Suspense>
    </RouteLoadErrorBoundary>
  );
}

function RouteContent() {
  const location = useLocation();
  const [transitionState, setTransitionState] = useState<RouteTransitionState>({
    isTransitioning: true,
    isPostLoginTransition: false,
    isPostLoginWaveComplete: false,
    isPostLoginRouteReady: false,
  });
  const consumedPostLoginLocationKeys = useRef(new Set<string>());

  const markPostLoginWaveComplete = useCallback(() => {
    setTransitionState((current) => {
      if (!current.isPostLoginTransition) return current;

      return {
        ...current,
        isPostLoginWaveComplete: true,
        isTransitioning: false,
        isPostLoginTransition: false,
      };
    });
  }, []);

  const markPostLoginRouteReady = useCallback(() => {
    setTransitionState((current) => {
      if (!current.isPostLoginTransition) return current;

      const nextState = { ...current, isPostLoginRouteReady: true };
      return current.isPostLoginWaveComplete
        ? { ...nextState, isTransitioning: false, isPostLoginTransition: false }
        : nextState;
    });
  }, []);

  useLayoutEffect(() => {
    const showPostLoginLoading = hasPostLoginLoadingMarker(location.state)
      && !consumedPostLoginLocationKeys.current.has(location.key);
    if (showPostLoginLoading) consumedPostLoginLocationKeys.current.add(location.key);
    setTransitionState({
      isTransitioning: true,
      isPostLoginTransition: showPostLoginLoading,
      isPostLoginWaveComplete: false,
      isPostLoginRouteReady: false,
    });
    const timeoutId = showPostLoginLoading
      ? null
      : window.setTimeout(
          () => setTransitionState({
            isTransitioning: false,
            isPostLoginTransition: false,
            isPostLoginWaveComplete: false,
            isPostLoginRouteReady: false,
          }),
          MINIMUM_LOADING_DURATION_MS,
        );

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [location.key, location.state]);

  const contextValue: RouteTransitionContextValue = {
    ...transitionState,
    markPostLoginWaveComplete,
    markPostLoginRouteReady,
  };
  const { isTransitioning, isPostLoginTransition } = transitionState;

  return (
      <RouteTransitionContext.Provider value={contextValue}>
      <>
        <div
          className={
            isTransitioning
              ? styles.routeContent
              : `${styles.routeContent} ${styles.routeContentVisible}`
          }
          inert={isTransitioning}
        >
          <FloatingButton />
          <Routes>
            {/* Rotas de Login */}
            <Route path="/" element={page(<Login />)} />
            <Route path="/login" element={page(<Login />)} />

            {/* Fluxo público de recuperação de senha */}
            <Route path="/passwordRecovery" element={page(<PasswordRecovery />)} />
            <Route path="/newPassword" element={page(<NewPassword />)} />

            {/* Rotas Privadas */}
            <Route element={<PrivateRoute />}>
              <Route element={page(<MainLayout />, markPostLoginRouteReady)}>
                <Route path="/overview" element={page(<Overview />)} />
                <Route
                  path="/home"
                  element={page(
                    <PostLoginRouteReady><Home /></PostLoginRouteReady>,
                    markPostLoginRouteReady,
                  )}
                />
                <Route path="/users/*" element={page(<Users />)} />
                <Route path="/usageHistory" element={page(<UsageHistory />)} />
                <Route path="/expiringProducts" element={page(<ExpiringProducts />)} />
                <Route path="/products" element={page(<Products />)} />
                <Route path="/products/:productId" element={page(<ProductDetails />)} />
                <Route path="/stock" element={page(<Stock />)} />
                <Route
                  path="/stock/cash-closing/:discrepancyId"
                  element={page(<CashClosingReport />)}
                />
                <Route
                  path="/stock/counts/new"
                  element={page(<NewStockCount />)}
                />
                <Route
                  path="/stock/damages"
                  element={page(<StockAdjustments />)}
                />
                <Route
                  path="/stock/transfers"
                  element={page(<StockTransfers />)}
                />
                <Route path="/stock/transfers/new" element={page(<NewTransfer />)} />
                <Route
                  path="/stock/suppliers"
                  element={page(<Suppliers />)}
                />
                <Route path="/stock/suppliers/new" element={page(<SupplierForm />)} />
                <Route path="/managementReports" element={page(<ManagementReports />)} />
                <Route path="/accounting/sped" element={page(<AccountingSped />)} />
                <Route
                  path="/productsRegistration"
                  element={page(<ProductsRegistration />)}
                />
                <Route path="/account" element={page(<Account />)} />
              </Route>
            </Route>

            {/* Um 'else' para erros */}
            <Route path="*" element={page(<ErrorPage />)} />
          </Routes>
        </div>
        {isTransitioning && (isPostLoginTransition
          ? <PostLoginLoading onWaveComplete={markPostLoginWaveComplete} />
          : <Loading />)}
      </>
    </RouteTransitionContext.Provider>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteContent />
    </BrowserRouter>
  );
}
