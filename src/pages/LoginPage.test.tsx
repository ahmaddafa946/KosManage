import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mockSignIn = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  it('mengisi kredensial akun demo tanpa input manual', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /akun demo/i }));

    expect(screen.getByLabelText('Email')).toHaveValue('owner@kosmanage.dev');
    expect(screen.getByLabelText('Password')).toHaveValue('KosManage!dev1');
  });
});
