import { Link } from 'react-router-dom';
import { PATHS } from '../../router/routes';

function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to={PATHS.DASHBOARD}>← Back to Dashboard</Link>
    </div>
  );
}

export default NotFoundPage;
