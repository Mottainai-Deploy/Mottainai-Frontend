export interface ProductFilterState {
  search: string;
  category: string;
}

export interface ProductsFiltersProps {
  value: ProductFilterState;
  categories: readonly string[];
  onChange: (filters: ProductFilterState) => void;
}
