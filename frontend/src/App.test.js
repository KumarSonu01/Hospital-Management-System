import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('AuraCare Hospital Management System - Frontend Tests', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, count: 0, appointments: [], beds: [] }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders AuraCare brand identity in navigation', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/Aura/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  test('renders Clinical Information System badge', () => {
    render(<App />);
    const badge = screen.getByText(/Clinical Hospital Information System/i);
    expect(badge).toBeInTheDocument();
  });

  test('renders Hero heading with precision care', () => {
    render(<App />);
    const heroHeading = screen.getByText(/Precision care with/i);
    expect(heroHeading).toBeInTheDocument();
  });

  test('renders Patient Health Records clinical module card', () => {
    render(<App />);
    const moduleCard = screen.getByText(/Patient Health Records/i);
    expect(moduleCard).toBeInTheDocument();
  });

  test('renders Ward & Bed Management module card', () => {
    render(<App />);
    const bedModule = screen.getByText(/Ward & Bed Management/i);
    expect(bedModule).toBeInTheDocument();
  });

  test('renders Pharmacy & Stock Alerts module card', () => {
    render(<App />);
    const pharmacyModule = screen.getByText(/Pharmacy & Stock Alerts/i);
    expect(pharmacyModule).toBeInTheDocument();
  });

  test('renders Role-Based Access Control feature badge', () => {
    render(<App />);
    const rbacBadge = screen.getByText(/Role-Based Access Control/i);
    expect(rbacBadge).toBeInTheDocument();
  });
});
