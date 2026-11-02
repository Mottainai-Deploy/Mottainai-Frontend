import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FolderNavigation from "@/components/FolderNavigation";
import {
  FOLDER_NAVIGATION_PATHS,
  FOLDER_NAVIGATION_ITEMS,
  STOCK_FOLDER_NAVIGATION_ITEMS,
  USERS_FOLDER_NAVIGATION_ITEMS,
} from "@/config/folder-navigation";
import styles from "./style.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Início",
  "/overview": "Visão Geral",
  "/users": "Usuários",
  "/account": "Minha conta",
  "/products": "Produtos",
  "/expiringProducts": "Produtos a Vencer",
  "/productsRegistration": "Cadastro de Produtos",
  "/stock": "Estoque",
  "/stock/counts/new": "Nova contagem",
  "/stock/damages": "Avarias e consumo interno",
  "/stock/transfers": "Transferência de lojas",
  "/stock/transfers/new": "Nova transferência",
  "/stock/suppliers": "Fornecedores",
  "/stock/suppliers/new": "Novo fornecedor",
};

function MainLayout() {
  const { pathname } = useLocation();
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const pageTitle = normalizedPathname.startsWith("/products/")
    ? "Detalhes do Produto"
    : normalizedPathname.startsWith("/users/")
      ? "Usuários"
    : (PAGE_TITLES[normalizedPathname] ?? "Mottainai");

  useEffect(() => {
    document.title = `${pageTitle} | Mottainai`;
  }, [pageTitle]);
  const isStockFlowActive =
    normalizedPathname === "/stock" || normalizedPathname.startsWith("/stock/");
  const isUsersFlowActive = normalizedPathname === "/users" || normalizedPathname.startsWith("/users/");
  const showFolderNavigation =
    isStockFlowActive || isUsersFlowActive || FOLDER_NAVIGATION_PATHS.includes(normalizedPathname);
  const folderNavigationItems = isStockFlowActive
    ? STOCK_FOLDER_NAVIGATION_ITEMS
    : isUsersFlowActive
      ? USERS_FOLDER_NAVIGATION_ITEMS
      : FOLDER_NAVIGATION_ITEMS;

  return (
    <div className={styles.layout}>
      <a className={styles["skip-link"]} href="#main-content">
        Pular para o conteúdo principal
      </a>
      <Sidebar overviewPaths={FOLDER_NAVIGATION_PATHS} />
      <div className={styles["content-shell"]}>
        <Header />
        {showFolderNavigation && (
          <FolderNavigation
            items={folderNavigationItems}
            ariaLabel={isStockFlowActive
              ? "Seções de estoque"
              : isUsersFlowActive
                ? "Seções de usuários e permissões"
                : "Seções de análise"}
          />
        )}
        <main
          className={`${styles.content} ${showFolderNavigation ? styles["content-with-folders"] : ""}`}
          id="main-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
