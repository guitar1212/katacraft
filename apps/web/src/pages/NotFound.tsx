import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-300">404</h1>
      <p className="mt-2 text-sm text-gray-500">Page not found</p>
      <Link to="/" className="mt-4 text-sm font-medium text-brand-700 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
