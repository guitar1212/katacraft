import { Link } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/browse?categoryId=${category.id}`}
      className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm font-medium text-gray-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      {category.name}
    </Link>
  );
}
