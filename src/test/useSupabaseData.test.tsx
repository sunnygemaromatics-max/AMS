import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets, useCreateAsset, useUpdateAsset } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase — hoisted so the mock factory can reference it
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSupabaseData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAssets', () => {
    it('should fetch assets successfully', async () => {
      const mockAssets = [
        {
          id: '1',
          name: 'Laptop',
          status: 'available',
          employees: { name: 'John Doe', employee_code: 'E001' },
          locations: { name: 'Office A', code: 'OA' },
        },
        {
          id: '2',
          name: 'Desktop',
          status: 'allocated',
          employees: { name: 'Jane Smith', employee_code: 'E002' },
          locations: { name: 'Office B', code: 'OB' },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockAssets,
        error: null,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAssets);
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      // Embed select uses a template literal — assert on key embedded relations rather than exact spacing
      const selectArg: string = mockSelect.mock.calls[0][0];
      expect(selectArg).toContain('employees:current_employee_id');
      expect(selectArg).toContain('locations:current_location_id');
      expect(selectArg).toContain('categories:category_id');
      expect(mockEq).toHaveBeenCalledWith('is_deleted', false);
      expect(mockOrder).toHaveBeenCalledWith('bin_card_no');
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch assets');
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useCreateAsset', () => {
    it('should create asset successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: createWrapper(),
      });

      const newAsset = {
        name: 'Test Laptop',
        status: 'available',
        bin_card_no: 'BC001',
      };

      result.current.mutate(newAsset as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      expect(mockInsert).toHaveBeenCalledWith(newAsset);
    });

    it('should handle create error', async () => {
      const mockError = new Error('Failed to create asset');
      const mockInsert = vi.fn().mockResolvedValue({
        error: mockError,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: createWrapper(),
      });

      const newAsset = {
        name: 'Test Laptop',
        status: 'available',
      };

      result.current.mutate(newAsset as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(mockError);
      });
    });
  });

  describe('useUpdateAsset', () => {
    it('should update asset successfully', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        id: '1',
        name: 'Updated Laptop',
        status: 'allocated',
      };

      result.current.mutate(updateData as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('assets');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Laptop', status: 'allocated' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('should handle update error', async () => {
      const mockError = new Error('Failed to update asset');
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: mockError,
      });

      (supabase.from as unknown as Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        id: '1',
        name: 'Updated Laptop',
      };

      result.current.mutate(updateData as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(mockError);
      });
    });
  });
});
