import React from 'react';
import { render } from '@testing-library/react';
import App from '../src/App.jsx';

describe('App component', () => {
  it('renders greeting', () => {
    const { getByText } = render(<App />);
    expect(getByText(/Hello from/)).toBeInTheDocument();
  });
}); 