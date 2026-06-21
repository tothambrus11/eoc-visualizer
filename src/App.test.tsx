import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders the parser UI', () => {
  render(<App />);
  expect(screen.getByText(/concurrency parser/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/program input/i)).toBeInTheDocument();
});

test('parses input and displays the AST', () => {
  render(<App />);
  const input = screen.getByLabelText(/program input/i);
  fireEvent.change(input, { target: { value: 'a || b' } });
  const output = screen.getByLabelText(/parsed output/i);
  expect(output.textContent).toContain('"type": "par"');
  expect(output.textContent).toContain('"name": "a"');
});

test('shows an error message for invalid input', () => {
  render(<App />);
  const input = screen.getByLabelText(/program input/i);
  fireEvent.change(input, { target: { value: 'a ;' } });
  const output = screen.getByLabelText(/parsed output/i);
  expect(output.textContent?.toLowerCase()).toContain('input');
});
