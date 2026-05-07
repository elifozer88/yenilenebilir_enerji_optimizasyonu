import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const title = screen.getByText(/İzmir Yenilenebilir Enerji DSS/i);
  expect(title).toBeInTheDocument();
});